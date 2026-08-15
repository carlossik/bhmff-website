begin;

-- Keep the public organisations record limited to high-level entitlement state.
-- Stripe identifiers and billing details live in a private service-role-only table.
create table if not exists public.organisation_billing (
    organisation_id uuid primary key
        references public.organisations(id)
        on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    stripe_price_id text,
    billing_interval text,
    stripe_status text,
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint organisation_billing_interval_check
        check (
            billing_interval is null
            or billing_interval in ('monthly', 'annual')
        )
);

alter table public.organisation_billing
    enable row level security;

revoke all on table public.organisation_billing
    from anon, authenticated;

-- Normalise the subscription-status check without assuming the legacy
-- constraint name. This keeps existing installations migration-safe.
do $$
declare
    constraint_row record;
begin
    for constraint_row in
        select conname
        from pg_constraint
        where conrelid = 'public.organisations'::regclass
          and contype = 'c'
          and pg_get_constraintdef(oid)
                ilike '%subscription_status%'
    loop
        execute format(
            'alter table public.organisations drop constraint %I',
            constraint_row.conname
        );
    end loop;
end
$$;

update public.organisations
set subscription_status = 'suspended'
where subscription_status not in (
    'trial',
    'active',
    'past_due',
    'suspended',
    'cancelled'
);

alter table public.organisations
    add constraint organisations_subscription_status_check
    check (
        subscription_status in (
            'trial',
            'active',
            'past_due',
            'suspended',
            'cancelled'
        )
    );

-- Subscription and entitlement fields are commercial controls.
-- Tenant administrators may edit their organisation profile, but cannot
-- promote themselves to a paid plan or increase account limits directly.
create or replace function public.enforce_organisation_billing_control()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    is_privileged boolean := false;
begin
    is_privileged :=
        coalesce(auth.role() = 'service_role', false)
        or exists (
            select 1
            from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.active = true
        );

    if is_privileged then
        return new;
    end if;

    if tg_op = 'INSERT' then
        new.subscription_plan := 'starter';
        new.subscription_status := 'active';
        new.trial_end := null;
        new.max_users := 2;
        new.max_competitions := 1;
        new.public_site_enabled := true;
        return new;
    end if;

    if new.subscription_plan
            is distinct from old.subscription_plan
       or new.subscription_status
            is distinct from old.subscription_status
       or new.trial_end
            is distinct from old.trial_end
       or new.max_users
            is distinct from old.max_users
       or new.max_competitions
            is distinct from old.max_competitions
    then
        raise exception
            'Subscription fields are managed by TournamentHQ billing.'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

revoke all on function
    public.enforce_organisation_billing_control()
from public;

-- Recreate idempotently so this migration is safe across development DBs.
drop trigger if exists
    organisations_billing_control_trigger
on public.organisations;

create trigger organisations_billing_control_trigger
before insert or update
on public.organisations
for each row
execute function
    public.enforce_organisation_billing_control();

commit;
