-- TournamentHQ Club Fixture RSVP / Player Availability MVP
-- Date: 2026-08-25
--
-- Adds fixture-centric availability requests, secure recipient tokens and
-- Resend delivery lifecycle tracking. Public RSVP responses are handled only
-- through the fixture-rsvp Edge Function; anonymous clients receive no direct
-- table access.

begin;

create table if not exists public.club_fixture_availability_requests (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid not null
        references public.club_seasons(id) on delete cascade,
    team_id uuid not null
        references public.teams(id) on delete cascade,
    fixture_id uuid not null
        references public.club_fixtures(id) on delete cascade,
    response_deadline timestamptz,
    message_note text,
    status text not null default 'active'
        check (status in ('active', 'closed', 'cancelled')),
    sent_at timestamptz,
    last_reminder_at timestamptz,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_fixture_availability_requests_fixture_key unique (fixture_id)
);

create index if not exists idx_club_fixture_availability_requests_scope
    on public.club_fixture_availability_requests (
        organisation_id,
        season_id,
        team_id,
        fixture_id
    );

create table if not exists public.club_fixture_availability_recipients (
    id uuid primary key default uuid_generate_v4(),
    request_id uuid not null
        references public.club_fixture_availability_requests(id) on delete cascade,
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid not null
        references public.club_seasons(id) on delete cascade,
    team_id uuid not null
        references public.teams(id) on delete cascade,
    fixture_id uuid not null
        references public.club_fixtures(id) on delete cascade,
    squad_member_id uuid not null
        references public.club_squad_members(id) on delete cascade,
    player_id uuid not null
        references public.club_players(id) on delete cascade,
    player_name text not null,
    recipient_email text,
    response text
        check (response is null or response in ('available', 'unavailable', 'maybe')),
    response_note text,
    responded_by_name text,
    responded_at timestamptz,
    delivery_status text not null default 'queued'
        check (delivery_status in (
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
        )),
    provider text not null default 'resend',
    provider_message_id text,
    queued_at timestamptz not null default now(),
    sent_at timestamptz,
    delivered_at timestamptz,
    delayed_at timestamptz,
    read_at timestamptz,
    bounced_at timestamptz,
    complained_at timestamptz,
    failed_at timestamptz,
    status_detail text,
    last_provider_event text,
    last_provider_event_at timestamptz,
    last_reminder_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_fixture_availability_recipients_member_key
        unique (request_id, squad_member_id)
);

create index if not exists idx_club_fixture_availability_recipients_request
    on public.club_fixture_availability_recipients (
        request_id,
        response,
        player_name
    );

create index if not exists idx_club_fixture_availability_recipients_provider
    on public.club_fixture_availability_recipients (
        provider,
        provider_message_id
    )
    where provider_message_id is not null;

create table if not exists public.club_fixture_availability_tokens (
    id uuid primary key default uuid_generate_v4(),
    recipient_id uuid not null
        references public.club_fixture_availability_recipients(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz not null default now(),
    constraint club_fixture_availability_tokens_hash_format
        check (token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists idx_club_fixture_availability_tokens_recipient
    on public.club_fixture_availability_tokens (recipient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS. Authenticated organisation administrators can read availability status.
-- Writes go through authenticated/service-role Edge Functions so public token
-- responses never require direct anonymous table permissions.
-- ---------------------------------------------------------------------------

alter table public.club_fixture_availability_requests enable row level security;
alter table public.club_fixture_availability_requests force row level security;
alter table public.club_fixture_availability_recipients enable row level security;
alter table public.club_fixture_availability_recipients force row level security;
alter table public.club_fixture_availability_tokens enable row level security;
alter table public.club_fixture_availability_tokens force row level security;

drop policy if exists club_fixture_availability_requests_select on public.club_fixture_availability_requests;
create policy club_fixture_availability_requests_select
on public.club_fixture_availability_requests
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships membership
        where membership.organisation_id = club_fixture_availability_requests.organisation_id
          and membership.user_id = auth.uid()
          and membership.active = true
          and membership.role in ('super_admin', 'competition_manager')
    )
    or exists (
        select 1
        from public.platform_admins platform_admin
        where platform_admin.user_id = auth.uid()
          and platform_admin.active = true
    )
);

drop policy if exists club_fixture_availability_recipients_select on public.club_fixture_availability_recipients;
create policy club_fixture_availability_recipients_select
on public.club_fixture_availability_recipients
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships membership
        where membership.organisation_id = club_fixture_availability_recipients.organisation_id
          and membership.user_id = auth.uid()
          and membership.active = true
          and membership.role in ('super_admin', 'competition_manager')
    )
    or exists (
        select 1
        from public.platform_admins platform_admin
        where platform_admin.user_id = auth.uid()
          and platform_admin.active = true
    )
);

revoke all on table public.club_fixture_availability_requests from anon;
revoke all on table public.club_fixture_availability_recipients from anon;
revoke all on table public.club_fixture_availability_tokens from anon;

revoke insert, update, delete on table public.club_fixture_availability_requests from authenticated;
revoke insert, update, delete on table public.club_fixture_availability_recipients from authenticated;
revoke all on table public.club_fixture_availability_tokens from authenticated;

grant select on table public.club_fixture_availability_requests to authenticated;
grant select on table public.club_fixture_availability_recipients to authenticated;

grant select, insert, update, delete on table public.club_fixture_availability_requests to service_role;
grant select, insert, update, delete on table public.club_fixture_availability_recipients to service_role;
grant select, insert, update, delete on table public.club_fixture_availability_tokens to service_role;

-- ---------------------------------------------------------------------------
-- Resend lifecycle hook used by the existing signed resend-webhook function.
-- Duplicate events are harmless and older events cannot regress visible status.
-- ---------------------------------------------------------------------------

create or replace function public.apply_resend_fixture_rsvp_event(
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
    v_event_at timestamptz := coalesce(p_event_created_at, now());
    v_next_status text;
    v_matched integer := 0;
begin
    if nullif(trim(p_provider_message_id), '') is null then
        return jsonb_build_object('ok', true, 'matched', 0);
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
        return jsonb_build_object('ok', true, 'matched', 0, 'ignored', true);
    end if;

    update public.club_fixture_availability_recipients recipient
    set
        sent_at = case
            when trim(p_event_type) = 'email.sent'
                then coalesce(recipient.sent_at, v_event_at)
            else recipient.sent_at
        end,
        delivered_at = case
            when trim(p_event_type) = 'email.delivered'
                then coalesce(recipient.delivered_at, v_event_at)
            else recipient.delivered_at
        end,
        delayed_at = case
            when trim(p_event_type) = 'email.delivery_delayed'
                then coalesce(recipient.delayed_at, v_event_at)
            else recipient.delayed_at
        end,
        read_at = case
            when trim(p_event_type) in ('email.opened', 'email.clicked')
                then coalesce(recipient.read_at, v_event_at)
            else recipient.read_at
        end,
        bounced_at = case
            when trim(p_event_type) = 'email.bounced'
                then coalesce(recipient.bounced_at, v_event_at)
            else recipient.bounced_at
        end,
        complained_at = case
            when trim(p_event_type) = 'email.complained'
                then coalesce(recipient.complained_at, v_event_at)
            else recipient.complained_at
        end,
        failed_at = case
            when v_next_status in ('failed', 'bounced')
                then coalesce(recipient.failed_at, v_event_at)
            else recipient.failed_at
        end,
        delivery_status = case
            when recipient.last_provider_event_at is null
                 or v_event_at >= recipient.last_provider_event_at
                then v_next_status
            else recipient.delivery_status
        end,
        status_detail = case
            when recipient.last_provider_event_at is null
                 or v_event_at >= recipient.last_provider_event_at
                then nullif(trim(coalesce(p_detail, '')), '')
            else recipient.status_detail
        end,
        last_provider_event = case
            when recipient.last_provider_event_at is null
                 or v_event_at >= recipient.last_provider_event_at
                then trim(p_event_type)
            else recipient.last_provider_event
        end,
        last_provider_event_at = case
            when recipient.last_provider_event_at is null
                 or v_event_at >= recipient.last_provider_event_at
                then v_event_at
            else recipient.last_provider_event_at
        end,
        updated_at = now()
    where recipient.provider = 'resend'
      and recipient.provider_message_id = trim(p_provider_message_id);

    get diagnostics v_matched = row_count;

    return jsonb_build_object(
        'ok', true,
        'matched', v_matched,
        'status', v_next_status
    );
end;
$$;

revoke all on function public.apply_resend_fixture_rsvp_event(
    text,
    text,
    timestamptz,
    text
) from public;
revoke all on function public.apply_resend_fixture_rsvp_event(
    text,
    text,
    timestamptz,
    text
) from anon;
revoke all on function public.apply_resend_fixture_rsvp_event(
    text,
    text,
    timestamptz,
    text
) from authenticated;
grant execute on function public.apply_resend_fixture_rsvp_event(
    text,
    text,
    timestamptz,
    text
) to service_role;

commit;
