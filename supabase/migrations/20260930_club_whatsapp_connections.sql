-- Local implementation only. Do not apply to production without a separately authorised rollout.
begin;

create table public.organisation_whatsapp_connections (
    organisation_id uuid primary key references public.organisations(id) on delete cascade,
    waba_id text not null check (waba_id ~ '^[0-9]+$'),
    phone_number_id text not null unique check (phone_number_id ~ '^[0-9]+$'),
    display_phone_number text not null,
    verified_name text not null default '',
    token_ciphertext text not null,
    token_expires_at timestamptz,
    onboarding_mode text not null check (onboarding_mode in ('business_app', 'platform')),
    connected_by uuid not null,
    updated_at timestamptz not null default now()
);
create table public.whatsapp_onboarding_sessions (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    user_id uuid not null,
    onboarding_mode text not null check (onboarding_mode in ('business_app', 'platform')),
    expires_at timestamptz not null default now() + interval '10 minutes'
);
create index on public.whatsapp_onboarding_sessions (organisation_id, user_id);
alter table public.organisation_whatsapp_connections enable row level security;
alter table public.organisation_whatsapp_connections force row level security;
alter table public.whatsapp_onboarding_sessions enable row level security;
alter table public.whatsapp_onboarding_sessions force row level security;
revoke all on public.organisation_whatsapp_connections, public.whatsapp_onboarding_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.organisation_whatsapp_connections, public.whatsapp_onboarding_sessions to service_role;

alter table public.communication_deliveries
    add column whatsapp_phone_number_id text,
    add column whatsapp_template_name text,
    add column whatsapp_template_language text,
    add column whatsapp_consent_confirmed_by uuid,
    add column whatsapp_consent_confirmed_at timestamptz;
create index on public.communication_deliveries (whatsapp_phone_number_id, provider_message_id) where provider = 'meta';

-- Store only event identifiers. The raw webhook (and conversation content) is never saved.
create or replace function public.apply_meta_whatsapp_event(
    p_event_id text, p_message_id text, p_phone_number_id text,
    p_delivery_id uuid, p_status text, p_event_at timestamptz, p_error_code text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_delivery public.communication_deliveries%rowtype;
    v_event uuid;
    v_rank integer;
    v_current_rank integer;
    v_apply boolean;
begin
    if p_status not in ('sent', 'delivered', 'read', 'failed') or p_event_id is null or p_event_at is null then
        raise exception 'Invalid WhatsApp event.';
    end if;
    select * into v_delivery from public.communication_deliveries
    where provider = 'meta' and whatsapp_phone_number_id = p_phone_number_id
      and (provider_message_id = p_message_id or
           (id = p_delivery_id and (provider_message_id is null or provider_message_id = p_message_id)))
    order by queued_at desc limit 1 for update;
    -- Retry an early webhook rather than permanently discarding it.
    if not found then raise exception 'WhatsApp delivery is not available yet.'; end if;
    insert into public.communication_webhook_events(provider, event_id, event_type, provider_message_id, delivery_id, event_created_at)
    values ('meta', p_event_id, p_status, p_message_id, v_delivery.id, p_event_at)
    on conflict (provider, event_id) do nothing returning id into v_event;
    if v_event is null then return jsonb_build_object('duplicate', true); end if;

    v_rank := case p_status when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 else 0 end;
    v_current_rank := case v_delivery.status when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 else 0 end;
    v_apply := case when p_status = 'failed' then
        v_current_rank < 2 and (v_delivery.last_provider_event_at is null or p_event_at >= v_delivery.last_provider_event_at)
        else v_rank >= v_current_rank and (v_delivery.status <> 'failed' or
             (v_delivery.last_provider_event_at is null or p_event_at >= v_delivery.last_provider_event_at)) end;

    update public.communication_deliveries set
        provider_message_id = coalesce(provider_message_id, p_message_id),
        status = case when v_apply then p_status else status end,
        sent_at = case when p_status = 'sent' then coalesce(sent_at, p_event_at) else sent_at end,
        delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, p_event_at) else delivered_at end,
        read_at = case when p_status = 'read' then coalesce(read_at, p_event_at) else read_at end,
        failed_at = case when p_status = 'failed' then coalesce(failed_at, p_event_at) else failed_at end,
        error_code = case when v_apply then p_error_code else error_code end,
        error_message = case when v_apply then case when p_status = 'failed' then 'WhatsApp delivery failed. Meta code: ' || coalesce(p_error_code, 'unknown') else null end else error_message end,
        last_provider_event = case when v_apply then p_status else last_provider_event end,
        last_provider_event_at = case when v_apply then p_event_at else last_provider_event_at end,
        updated_at = now()
    where id = v_delivery.id;
    update public.communication_webhook_events set processed_at = now(), outcome = case when v_apply then 'applied' else 'ignored_out_of_order' end where id = v_event;
    return jsonb_build_object('duplicate', false, 'updated', v_apply);
end;
$$;
revoke all on function public.apply_meta_whatsapp_event(text,text,text,uuid,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.apply_meta_whatsapp_event(text,text,text,uuid,text,timestamptz,text) to service_role;

-- The provider response can arrive after a delivered/read webhook. Never regress that state.
create or replace function public.record_meta_whatsapp_submission(p_delivery_id uuid, p_organisation_id uuid, p_message_id text)
returns void language sql security definer set search_path = public as $$
    update public.communication_deliveries set
        provider_message_id = coalesce(provider_message_id, p_message_id),
        status = case when status = 'queued' then 'accepted' else status end,
        updated_at = now()
    where id = p_delivery_id and organisation_id = p_organisation_id and provider = 'meta'
      and (provider_message_id is null or provider_message_id = p_message_id);
$$;
revoke all on function public.record_meta_whatsapp_submission(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.record_meta_whatsapp_submission(uuid,uuid,text) to service_role;
commit;
