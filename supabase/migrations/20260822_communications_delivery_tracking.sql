-- TournamentHQ Communications Phase 4.5
-- Delivery tracking, Resend webhook idempotency and user-facing lifecycle statuses.
-- Date: 2026-08-22
--
-- Safe design goals:
--   * preserve every existing communication delivery row;
--   * expand, never narrow, the delivery lifecycle;
--   * keep webhook audit data private;
--   * handle duplicate and out-of-order Resend webhook events safely;
--   * expose no anonymous access to communications data.

begin;

-- ---------------------------------------------------------------------------
-- 1. Expand the delivery lifecycle and retain provider event timestamps.
-- ---------------------------------------------------------------------------

alter table public.communication_deliveries
    drop constraint if exists communication_deliveries_status_check;

alter table public.communication_deliveries
    add constraint communication_deliveries_status_check
    check (status in (
        'queued',
        'accepted',
        'sent',
        'delivery_delayed',
        'delivered',
        'read',
        'bounced',
        'complained',
        'failed',
        'skipped'
    ));

alter table public.communication_deliveries
    add column if not exists delayed_at timestamptz,
    add column if not exists bounced_at timestamptz,
    add column if not exists complained_at timestamptz,
    add column if not exists status_detail text,
    add column if not exists last_provider_event text,
    add column if not exists last_provider_event_at timestamptz;

create index if not exists idx_communication_deliveries_provider_event
    on public.communication_deliveries (
        provider,
        last_provider_event_at desc
    )
    where provider_message_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Private idempotency/audit table for provider webhook events.
--    Do not store the full webhook payload: only the identifiers required to
--    process and deduplicate events.
-- ---------------------------------------------------------------------------

create table if not exists public.communication_webhook_events (
    id uuid primary key default uuid_generate_v4(),
    provider text not null,
    event_id text not null,
    event_type text not null,
    provider_message_id text,
    delivery_id uuid null
        references public.communication_deliveries(id) on delete set null,
    event_created_at timestamptz,
    received_at timestamptz not null default now(),
    processed_at timestamptz,
    outcome text not null default 'received',
    detail text,
    constraint communication_webhook_events_provider_event_key
        unique (provider, event_id)
);

create index if not exists idx_communication_webhook_events_message
    on public.communication_webhook_events (
        provider,
        provider_message_id,
        event_created_at desc
    );

alter table public.communication_webhook_events enable row level security;
alter table public.communication_webhook_events force row level security;

-- The webhook endpoint uses the service role after validating the Resend
-- signature. Browser users must not query this table directly.
revoke all on table public.communication_webhook_events from anon;
revoke all on table public.communication_webhook_events from authenticated;
grant select, insert, update on table public.communication_webhook_events to service_role;

-- ---------------------------------------------------------------------------
-- 3. Transactional Resend event application.
--
-- Resend webhooks are at-least-once and may arrive out of order. This function:
--   * inserts the svix event id and delivery update in one transaction;
--   * treats a repeated svix id as a successful duplicate;
--   * always fills event-specific timestamps;
--   * only changes the headline status when the event is not older than the
--     most recently applied provider event.
-- ---------------------------------------------------------------------------

create or replace function public.apply_resend_communication_event(
    p_event_id text,
    p_event_type text,
    p_provider_message_id text,
    p_event_created_at timestamptz,
    p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_webhook_event_id uuid;
    v_delivery_id uuid;
    v_current_status text;
    v_current_event_at timestamptz;
    v_event_at timestamptz := coalesce(p_event_created_at, now());
    v_next_status text;
    v_is_newest boolean;
    v_failure boolean := false;
begin
    if nullif(trim(p_event_id), '') is null then
        raise exception 'Resend webhook event id is required.';
    end if;

    if nullif(trim(p_event_type), '') is null then
        raise exception 'Resend webhook event type is required.';
    end if;

    if nullif(trim(p_provider_message_id), '') is null then
        raise exception 'Resend email id is required.';
    end if;

    insert into public.communication_webhook_events (
        provider,
        event_id,
        event_type,
        provider_message_id,
        event_created_at
    )
    values (
        'resend',
        trim(p_event_id),
        trim(p_event_type),
        trim(p_provider_message_id),
        v_event_at
    )
    on conflict (provider, event_id) do nothing
    returning id into v_webhook_event_id;

    if v_webhook_event_id is null then
        return jsonb_build_object(
            'ok', true,
            'duplicate', true,
            'matched', true
        );
    end if;

    select
        delivery.id,
        delivery.status,
        delivery.last_provider_event_at
    into
        v_delivery_id,
        v_current_status,
        v_current_event_at
    from public.communication_deliveries delivery
    where delivery.provider = 'resend'
      and delivery.provider_message_id = trim(p_provider_message_id)
    order by delivery.queued_at desc
    limit 1
    for update;

    if v_delivery_id is null then
        update public.communication_webhook_events
        set
            processed_at = now(),
            outcome = 'ignored',
            detail = 'No TournamentHQ delivery matched this Resend email id.'
        where id = v_webhook_event_id;

        return jsonb_build_object(
            'ok', true,
            'duplicate', false,
            'matched', false
        );
    end if;

    v_next_status := case trim(p_event_type)
        when 'email.sent' then 'sent'
        when 'email.delivered' then 'delivered'
        when 'email.delivery_delayed' then 'delivery_delayed'
        when 'email.opened' then 'read'
        when 'email.clicked' then 'read'
        when 'email.bounced' then 'bounced'
        when 'email.complained' then 'complained'
        when 'email.failed' then 'failed'
        when 'email.suppressed' then 'failed'
        when 'email.canceled' then 'failed'
        else null
    end;

    if v_next_status is null then
        update public.communication_webhook_events
        set
            delivery_id = v_delivery_id,
            processed_at = now(),
            outcome = 'ignored',
            detail = 'Unsupported Resend event type.'
        where id = v_webhook_event_id;

        return jsonb_build_object(
            'ok', true,
            'duplicate', false,
            'matched', true,
            'updated', false
        );
    end if;

    v_failure := v_next_status in ('failed', 'bounced', 'complained');
    v_is_newest :=
        v_current_event_at is null
        or v_event_at >= v_current_event_at;

    update public.communication_deliveries
    set
        -- Preserve precise lifecycle timestamps even when an older event arrives
        -- after a newer one.
        sent_at = case
            when trim(p_event_type) = 'email.sent'
                then coalesce(sent_at, v_event_at)
            else sent_at
        end,
        delayed_at = case
            when trim(p_event_type) = 'email.delivery_delayed'
                then coalesce(delayed_at, v_event_at)
            else delayed_at
        end,
        delivered_at = case
            when trim(p_event_type) = 'email.delivered'
                then coalesce(delivered_at, v_event_at)
            else delivered_at
        end,
        read_at = case
            when trim(p_event_type) in ('email.opened', 'email.clicked')
                then coalesce(read_at, v_event_at)
            else read_at
        end,
        bounced_at = case
            when trim(p_event_type) = 'email.bounced'
                then coalesce(bounced_at, v_event_at)
            else bounced_at
        end,
        complained_at = case
            when trim(p_event_type) = 'email.complained'
                then coalesce(complained_at, v_event_at)
            else complained_at
        end,
        failed_at = case
            when v_next_status in ('failed', 'bounced')
                then coalesce(failed_at, v_event_at)
            else failed_at
        end,

        -- Never regress the headline status because an older webhook was
        -- delivered later by the network.
        status = case
            when v_is_newest then v_next_status
            else status
        end,
        status_detail = case
            when v_is_newest then nullif(trim(coalesce(p_detail, '')), '')
            else status_detail
        end,
        error_message = case
            when v_is_newest and v_failure
                then nullif(trim(coalesce(p_detail, '')), '')
            when v_is_newest and not v_failure
                then null
            else error_message
        end,
        last_provider_event = case
            when v_is_newest then trim(p_event_type)
            else last_provider_event
        end,
        last_provider_event_at = case
            when v_is_newest then v_event_at
            else last_provider_event_at
        end,
        updated_at = now()
    where id = v_delivery_id;

    update public.communication_webhook_events
    set
        delivery_id = v_delivery_id,
        processed_at = now(),
        outcome = case
            when v_is_newest then 'applied'
            else 'applied_out_of_order'
        end,
        detail = nullif(trim(coalesce(p_detail, '')), '')
    where id = v_webhook_event_id;

    return jsonb_build_object(
        'ok', true,
        'duplicate', false,
        'matched', true,
        'updated', true,
        'deliveryId', v_delivery_id,
        'status', v_next_status,
        'newest', v_is_newest
    );
end;
$$;

revoke all on function public.apply_resend_communication_event(
    text,
    text,
    text,
    timestamptz,
    text
) from public;
revoke all on function public.apply_resend_communication_event(
    text,
    text,
    text,
    timestamptz,
    text
) from anon;
revoke all on function public.apply_resend_communication_event(
    text,
    text,
    text,
    timestamptz,
    text
) from authenticated;
grant execute on function public.apply_resend_communication_event(
    text,
    text,
    text,
    timestamptz,
    text
) to service_role;

commit;
