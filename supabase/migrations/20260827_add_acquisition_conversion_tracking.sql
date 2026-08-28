-- TournamentHQ Marketing & Acquisition Phase 2
-- Persist first-touch campaign attribution from authenticated self-service signup,
-- record onboarding completion, and keep trial / paid conversion lifecycle in sync
-- with the existing organisations subscription state.
--
-- Apply this file directly in the Supabase SQL Editor.

begin;

create table if not exists public.organisation_acquisition (
    organisation_id uuid primary key
        references public.organisations(id)
        on delete cascade,
    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    requested_organisation_type text,
    requested_plan text,
    requested_billing_interval text,

    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_id text,
    utm_term text,
    utm_content text,

    gclid text,
    gbraid text,
    wbraid text,
    msclkid text,

    referrer_domain text,
    landing_path text,

    signup_completed_at timestamptz,
    organisation_created_at timestamptz not null default now(),
    onboarding_completed_at timestamptz,
    subscription_started_at timestamptz,
    trial_started_at timestamptz,
    trial_end_at timestamptz,
    paid_conversion_at timestamptz,

    current_subscription_plan text,
    current_subscription_status text,
    current_billing_interval text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint organisation_acquisition_requested_type_check
        check (
            requested_organisation_type is null
            or requested_organisation_type in (
                'competition_organiser',
                'club'
            )
        ),
    constraint organisation_acquisition_requested_plan_check
        check (
            requested_plan is null
            or requested_plan in (
                'trial',
                'starter',
                'professional',
                'enterprise'
            )
        ),
    constraint organisation_acquisition_requested_billing_check
        check (
            requested_billing_interval is null
            or requested_billing_interval in (
                'monthly',
                'annual'
            )
        ),
    constraint organisation_acquisition_current_plan_check
        check (
            current_subscription_plan is null
            or current_subscription_plan in (
                'starter',
                'professional',
                'enterprise'
            )
        ),
    constraint organisation_acquisition_current_status_check
        check (
            current_subscription_status is null
            or current_subscription_status in (
                'trial',
                'active',
                'past_due',
                'suspended',
                'cancelled'
            )
        ),
    constraint organisation_acquisition_current_billing_check
        check (
            current_billing_interval is null
            or current_billing_interval in (
                'monthly',
                'annual'
            )
        )
);

create index if not exists
    organisation_acquisition_user_id_idx
on public.organisation_acquisition(user_id);

create index if not exists
    organisation_acquisition_campaign_idx
on public.organisation_acquisition(utm_campaign);

create index if not exists
    organisation_acquisition_source_medium_idx
on public.organisation_acquisition(utm_source, utm_medium);

create index if not exists
    organisation_acquisition_paid_conversion_idx
on public.organisation_acquisition(paid_conversion_at)
where paid_conversion_at is not null;

alter table public.organisation_acquisition
    enable row level security;

drop policy if exists
    "Organisation members can view acquisition attribution"
on public.organisation_acquisition;

create policy
    "Organisation members can view acquisition attribution"
on public.organisation_acquisition
for select
to authenticated
using (
    public.is_active_organisation_member(organisation_id)
    or public.is_platform_admin()
);

-- First-touch capture ---------------------------------------------------------
-- The existing onboarding RPC atomically creates the organisation and then the
-- owner's super_admin membership. This trigger attaches acquisition metadata to
-- that membership creation without changing or weakening the onboarding RPC.

create or replace function public.capture_self_service_acquisition()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    v_metadata jsonb := coalesce(
        auth.jwt() -> 'user_metadata',
        '{}'::jsonb
    );
    v_signup_created_at timestamptz;
    v_organisation_created_at timestamptz;
    v_subscription_plan text;
    v_subscription_status text;
begin
    if new.active is not true
       or new.role <> 'super_admin'
       or auth.uid() is null
       or new.user_id <> auth.uid() then
        return new;
    end if;

    if not (
        v_metadata ? 'signup_organisation_type'
        or v_metadata ? 'signup_plan'
    ) then
        return new;
    end if;

    select user_row.created_at
    into v_signup_created_at
    from auth.users user_row
    where user_row.id = new.user_id;

    select
        organisation.created_at,
        organisation.subscription_plan,
        organisation.subscription_status
    into
        v_organisation_created_at,
        v_subscription_plan,
        v_subscription_status
    from public.organisations organisation
    where organisation.id = new.organisation_id;

    insert into public.organisation_acquisition (
        organisation_id,
        user_id,
        requested_organisation_type,
        requested_plan,
        requested_billing_interval,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_id,
        utm_term,
        utm_content,
        gclid,
        gbraid,
        wbraid,
        msclkid,
        referrer_domain,
        landing_path,
        signup_completed_at,
        organisation_created_at,
        current_subscription_plan,
        current_subscription_status
    )
    values (
        new.organisation_id,
        new.user_id,
        nullif(v_metadata ->> 'signup_organisation_type', ''),
        nullif(v_metadata ->> 'signup_plan', ''),
        nullif(v_metadata ->> 'signup_billing_interval', ''),
        nullif(v_metadata ->> 'acquisition_utm_source', ''),
        nullif(v_metadata ->> 'acquisition_utm_medium', ''),
        nullif(v_metadata ->> 'acquisition_utm_campaign', ''),
        nullif(v_metadata ->> 'acquisition_utm_id', ''),
        nullif(v_metadata ->> 'acquisition_utm_term', ''),
        nullif(v_metadata ->> 'acquisition_utm_content', ''),
        nullif(v_metadata ->> 'acquisition_gclid', ''),
        nullif(v_metadata ->> 'acquisition_gbraid', ''),
        nullif(v_metadata ->> 'acquisition_wbraid', ''),
        nullif(v_metadata ->> 'acquisition_msclkid', ''),
        nullif(v_metadata ->> 'acquisition_referrer_domain', ''),
        nullif(v_metadata ->> 'acquisition_landing_path', ''),
        v_signup_created_at,
        coalesce(v_organisation_created_at, now()),
        v_subscription_plan,
        v_subscription_status
    )
    on conflict (organisation_id) do nothing;

    return new;
end;
$$;

revoke all
on function public.capture_self_service_acquisition()
from public;

drop trigger if exists
    capture_self_service_acquisition_trigger
on public.organisation_memberships;

create trigger capture_self_service_acquisition_trigger
after insert
on public.organisation_memberships
for each row
execute function public.capture_self_service_acquisition();

-- Onboarding completion ------------------------------------------------------

create or replace function public.mark_onboarding_complete(
    p_organisation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    v_user_id uuid := auth.uid();
    v_organisation_created_at timestamptz;
    v_subscription_plan text;
    v_subscription_status text;
begin
    if v_user_id is null then
        raise exception
            'Authentication is required.'
            using errcode = '42501';
    end if;

    if not (
        public.is_active_organisation_member(
            p_organisation_id
        )
        or public.is_platform_admin(v_user_id)
    ) then
        raise exception
            'You do not have access to this organisation.'
            using errcode = '42501';
    end if;

    select
        organisation.created_at,
        organisation.subscription_plan,
        organisation.subscription_status
    into
        v_organisation_created_at,
        v_subscription_plan,
        v_subscription_status
    from public.organisations organisation
    where organisation.id = p_organisation_id;

    if not found then
        raise exception
            'Organisation not found.'
            using errcode = 'P0002';
    end if;

    insert into public.organisation_acquisition (
        organisation_id,
        user_id,
        requested_organisation_type,
        requested_plan,
        organisation_created_at,
        onboarding_completed_at,
        current_subscription_plan,
        current_subscription_status
    )
    select
        organisation.id,
        v_user_id,
        organisation.organisation_type::text,
        organisation.subscription_plan,
        coalesce(v_organisation_created_at, now()),
        now(),
        v_subscription_plan,
        v_subscription_status
    from public.organisations organisation
    where organisation.id = p_organisation_id
    on conflict (organisation_id)
    do update set
        onboarding_completed_at = coalesce(
            public.organisation_acquisition.onboarding_completed_at,
            excluded.onboarding_completed_at
        ),
        current_subscription_plan = excluded.current_subscription_plan,
        current_subscription_status = excluded.current_subscription_status,
        updated_at = now();
end;
$$;

revoke all
on function public.mark_onboarding_complete(uuid)
from public;

revoke all
on function public.mark_onboarding_complete(uuid)
from anon;

grant execute
on function public.mark_onboarding_complete(uuid)
to authenticated;

-- Subscription / conversion lifecycle --------------------------------------
-- Stripe already updates organisations.subscription_* through the existing
-- webhook. This trigger records durable funnel timestamps without modifying the
-- Stripe Edge Function or introducing a second billing implementation.

create or replace function public.sync_acquisition_subscription_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    update public.organisation_acquisition
    set
        current_subscription_plan = new.subscription_plan,
        current_subscription_status = new.subscription_status,
        trial_end_at = new.trial_end,
        subscription_started_at = case
            when new.subscription_status in (
                'trial',
                'active',
                'past_due'
            ) then coalesce(
                subscription_started_at,
                now()
            )
            else subscription_started_at
        end,
        trial_started_at = case
            when new.subscription_status = 'trial'
            then coalesce(
                trial_started_at,
                now()
            )
            else trial_started_at
        end,
        paid_conversion_at = case
            when new.subscription_status = 'active'
            then coalesce(
                paid_conversion_at,
                now()
            )
            else paid_conversion_at
        end,
        updated_at = now()
    where organisation_id = new.id;

    return new;
end;
$$;

revoke all
on function public.sync_acquisition_subscription_lifecycle()
from public;

drop trigger if exists
    sync_acquisition_subscription_lifecycle_trigger
on public.organisations;

create trigger sync_acquisition_subscription_lifecycle_trigger
after insert or update of
    subscription_plan,
    subscription_status,
    trial_end
on public.organisations
for each row
execute function public.sync_acquisition_subscription_lifecycle();


-- Billing interval sync -------------------------------------------------------

create or replace function public.sync_acquisition_billing_interval()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    update public.organisation_acquisition
    set
        current_billing_interval = new.billing_interval,
        updated_at = now()
    where organisation_id = new.organisation_id;

    return new;
end;
$$;

revoke all
on function public.sync_acquisition_billing_interval()
from public;

drop trigger if exists
    sync_acquisition_billing_interval_trigger
on public.organisation_billing;

create trigger sync_acquisition_billing_interval_trigger
after insert or update of billing_interval
on public.organisation_billing
for each row
execute function public.sync_acquisition_billing_interval();

comment on table public.organisation_acquisition is
'TournamentHQ first-touch acquisition attribution and self-service signup/onboarding/trial/paid conversion lifecycle.';

commit;
