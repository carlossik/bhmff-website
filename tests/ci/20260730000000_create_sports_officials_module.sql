-- TournamentHQ - Sports Officials Module
-- Migration: 20260730_create_sports_officials_module.sql
--
-- Creates the multi-tenant Sports Officials data model used by:
--   src/types/officialTypes.ts
--   src/services/officialService.ts
--
-- Safety notes:
--   1. The migration is designed to be re-runnable.
--   2. All private tables use organisation-scoped RLS.
--   3. No anonymous policy is created on public.officials because that table
--      contains personal and safeguarding-sensitive fields.
--   4. A safe public marketplace view is created instead. The frontend service
--      should use public.public_official_marketplace for anonymous searches.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.tournamenthq_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organisation membership helper used by all RLS policies
-- ---------------------------------------------------------------------------

create or replace function public.tournamenthq_is_organisation_member(
    requested_organisation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organisation_memberships membership
        where membership.organisation_id = requested_organisation_id
          and membership.user_id = auth.uid()
    );
$$;

revoke all on function public.tournamenthq_is_organisation_member(uuid) from public;
grant execute on function public.tournamenthq_is_organisation_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Core officials
-- ---------------------------------------------------------------------------

create table if not exists public.officials (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    user_id uuid null references auth.users(id) on delete set null,
    sport_id uuid null,

    first_name text not null,
    last_name text not null,
    full_name text not null,
    email text not null,
    phone text null,
    date_of_birth date null,
    gender text null check (
        gender is null or gender in (
            'male', 'female', 'non_binary', 'prefer_not_to_say'
        )
    ),

    role text not null check (role in (
        'referee',
        'assistant_referee',
        'fourth_official',
        'match_commissioner',
        'assessor',
        'observer',
        'timekeeper',
        'scorekeeper',
        'umpire',
        'line_judge',
        'table_official',
        'marshal',
        'technical_delegate',
        'venue_official',
        'medical_official',
        'other'
    )),
    status text not null default 'pending' check (status in (
        'active', 'inactive', 'pending', 'suspended', 'retired', 'archived'
    )),
    verification_status text not null default 'not_verified' check (
        verification_status in ('not_verified', 'pending', 'verified', 'rejected')
    ),
    marketplace_visibility text not null default 'private' check (
        marketplace_visibility in ('private', 'organisation_only', 'public')
    ),

    profile_photo_url text null,
    biography text null,
    nationality text null,
    county text null,
    city text null,
    postcode text null,
    latitude numeric(9,6) null check (latitude is null or latitude between -90 and 90),
    longitude numeric(9,6) null check (longitude is null or longitude between -180 and 180),
    travel_preference text null default 'local_only' check (
        travel_preference is null or travel_preference in (
            'local_only', 'regional', 'national', 'international'
        )
    ),
    maximum_travel_distance_km numeric(8,2) null check (
        maximum_travel_distance_km is null or maximum_travel_distance_km >= 0
    ),

    emergency_contact_name text null,
    emergency_contact_phone text null,
    notes text null,

    average_rating numeric(3,2) null check (
        average_rating is null or average_rating between 0 and 5
    ),
    total_ratings integer not null default 0 check (total_ratings >= 0),
    completed_matches integer not null default 0 check (completed_matches >= 0),
    completed_tournaments integer not null default 0 check (completed_tournaments >= 0),
    ai_assignment_score numeric(7,4) null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint officials_names_not_blank check (
        length(btrim(first_name)) > 0 and length(btrim(last_name)) > 0
    ),
    constraint officials_email_not_blank check (length(btrim(email)) > 0),
    constraint officials_unique_email_per_organisation unique (organisation_id, email)
);

create index if not exists officials_organisation_id_idx
    on public.officials (organisation_id);
create index if not exists officials_organisation_status_idx
    on public.officials (organisation_id, status);
create index if not exists officials_organisation_role_idx
    on public.officials (organisation_id, role);
create index if not exists officials_organisation_sport_idx
    on public.officials (organisation_id, sport_id);
create index if not exists officials_verification_idx
    on public.officials (organisation_id, verification_status);
create index if not exists officials_marketplace_idx
    on public.officials (marketplace_visibility, status, verification_status);
create index if not exists officials_user_id_idx
    on public.officials (user_id) where user_id is not null;
create index if not exists officials_name_search_idx
    on public.officials (organisation_id, lower(last_name), lower(first_name));

create or replace function public.tournamenthq_prepare_official()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.first_name = btrim(new.first_name);
    new.last_name = btrim(new.last_name);
    new.email = lower(btrim(new.email));
    new.full_name = concat_ws(' ', new.first_name, new.last_name);
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists officials_prepare_row on public.officials;
create trigger officials_prepare_row
before insert or update on public.officials
for each row execute function public.tournamenthq_prepare_official();

-- ---------------------------------------------------------------------------
-- Qualifications
-- ---------------------------------------------------------------------------

create table if not exists public.official_qualifications (
    id uuid primary key default gen_random_uuid(),
    official_id uuid not null references public.officials(id) on delete cascade,
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    sport_id uuid null,
    qualification_name text not null,
    issuing_body text not null,
    qualification_level text null,
    certificate_number text null,
    issue_date date null,
    expiry_date date null,
    status text not null default 'pending' check (
        status in ('active', 'expired', 'pending', 'suspended')
    ),
    document_url text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint official_qualification_dates_valid check (
        expiry_date is null or issue_date is null or expiry_date >= issue_date
    )
);

create index if not exists official_qualifications_official_idx
    on public.official_qualifications (official_id);
create index if not exists official_qualifications_org_idx
    on public.official_qualifications (organisation_id);
create index if not exists official_qualifications_expiry_idx
    on public.official_qualifications (organisation_id, expiry_date)
    where expiry_date is not null;

-- ---------------------------------------------------------------------------
-- Compliance
-- ---------------------------------------------------------------------------

create table if not exists public.official_compliance (
    id uuid primary key default gen_random_uuid(),
    official_id uuid not null references public.officials(id) on delete cascade,
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    compliance_name text not null,
    status text not null default 'missing' check (
        status in ('valid', 'expiring', 'expired', 'missing')
    ),
    issue_date date null,
    expiry_date date null,
    document_url text null,
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint official_compliance_dates_valid check (
        expiry_date is null or issue_date is null or expiry_date >= issue_date
    )
);

create index if not exists official_compliance_official_idx
    on public.official_compliance (official_id);
create index if not exists official_compliance_org_idx
    on public.official_compliance (organisation_id);
create index if not exists official_compliance_expiry_idx
    on public.official_compliance (organisation_id, expiry_date)
    where expiry_date is not null;

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------

create table if not exists public.official_availability (
    id uuid primary key default gen_random_uuid(),
    official_id uuid not null references public.officials(id) on delete cascade,
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    start_datetime timestamptz not null,
    end_datetime timestamptz not null,
    status text not null default 'available' check (
        status in ('available', 'unavailable', 'tentative', 'holiday', 'blocked')
    ),
    recurring boolean not null default false,
    recurrence_rule text null,
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint official_availability_dates_valid check (end_datetime > start_datetime),
    constraint official_availability_recurrence_valid check (
        recurring = false or recurrence_rule is not null
    )
);

create index if not exists official_availability_official_idx
    on public.official_availability (official_id, start_datetime, end_datetime);
create index if not exists official_availability_org_window_idx
    on public.official_availability (organisation_id, start_datetime, end_datetime);
create index if not exists official_availability_blocked_window_idx
    on public.official_availability (organisation_id, status, start_datetime, end_datetime)
    where status in ('unavailable', 'holiday', 'blocked');

-- ---------------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------------

create table if not exists public.official_assignments (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    official_id uuid not null references public.officials(id) on delete cascade,
    competition_id uuid null,
    fixture_id uuid null,
    venue_id uuid null,
    sport_id uuid null,
    role text not null check (role in (
        'referee',
        'assistant_referee',
        'fourth_official',
        'match_commissioner',
        'assessor',
        'observer',
        'timekeeper',
        'scorekeeper',
        'umpire',
        'line_judge',
        'table_official',
        'marshal',
        'technical_delegate',
        'venue_official',
        'medical_official',
        'other'
    )),
    source text not null default 'manual' check (
        source in ('manual', 'ai', 'marketplace')
    ),
    status text not null default 'draft' check (status in (
        'draft', 'proposed', 'offered', 'accepted', 'declined', 'confirmed',
        'completed', 'cancelled', 'no_show'
    )),
    assignment_score numeric(7,4) null,
    travel_distance_km numeric(8,2) null check (
        travel_distance_km is null or travel_distance_km >= 0
    ),
    travel_duration_minutes integer null check (
        travel_duration_minutes is null or travel_duration_minutes >= 0
    ),
    assigned_fee numeric(12,2) null check (assigned_fee is null or assigned_fee >= 0),
    assigned_expenses numeric(12,2) null check (
        assigned_expenses is null or assigned_expenses >= 0
    ),
    assigned_by uuid null references auth.users(id) on delete set null,
    assigned_at timestamptz null,
    accepted_at timestamptz null,
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint official_assignment_target_present check (
        competition_id is not null or fixture_id is not null
    )
);

create index if not exists official_assignments_org_idx
    on public.official_assignments (organisation_id);
create index if not exists official_assignments_official_idx
    on public.official_assignments (official_id, status);
create index if not exists official_assignments_fixture_idx
    on public.official_assignments (fixture_id) where fixture_id is not null;
create index if not exists official_assignments_competition_idx
    on public.official_assignments (competition_id) where competition_id is not null;
create index if not exists official_assignments_assigned_at_idx
    on public.official_assignments (organisation_id, assigned_at)
    where assigned_at is not null;

-- Prevent duplicate active appointments for the same role on one fixture.
create unique index if not exists official_assignments_unique_active_fixture_role_idx
    on public.official_assignments (fixture_id, official_id, role)
    where fixture_id is not null
      and status not in ('declined', 'cancelled', 'no_show');

-- ---------------------------------------------------------------------------
-- Ratings
-- ---------------------------------------------------------------------------

create table if not exists public.official_ratings (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    official_id uuid not null references public.officials(id) on delete cascade,
    assignment_id uuid null references public.official_assignments(id) on delete set null,
    fixture_id uuid null,
    overall_rating numeric(2,1) not null check (overall_rating between 1 and 5),
    punctuality_rating numeric(2,1) null check (punctuality_rating between 1 and 5),
    professionalism_rating numeric(2,1) null check (professionalism_rating between 1 and 5),
    communication_rating numeric(2,1) null check (communication_rating between 1 and 5),
    knowledge_rating numeric(2,1) null check (knowledge_rating between 1 and 5),
    fairness_rating numeric(2,1) null check (fairness_rating between 1 and 5),
    comments text null,
    rated_by uuid null references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists official_ratings_official_idx
    on public.official_ratings (official_id, created_at desc);
create index if not exists official_ratings_org_idx
    on public.official_ratings (organisation_id);
create unique index if not exists official_ratings_one_per_rater_assignment_idx
    on public.official_ratings (assignment_id, rated_by)
    where assignment_id is not null and rated_by is not null;

create or replace function public.tournamenthq_refresh_official_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    target_official_id uuid;
begin
    target_official_id := coalesce(new.official_id, old.official_id);

    update public.officials official
    set average_rating = rating_summary.average_rating,
        total_ratings = rating_summary.total_ratings,
        updated_at = now()
    from (
        select
            round(avg(rating.overall_rating)::numeric, 2) as average_rating,
            count(*)::integer as total_ratings
        from public.official_ratings rating
        where rating.official_id = target_official_id
    ) rating_summary
    where official.id = target_official_id;

    return coalesce(new, old);
end;
$$;

drop trigger if exists official_ratings_refresh_summary on public.official_ratings;
create trigger official_ratings_refresh_summary
after insert or update or delete on public.official_ratings
for each row execute function public.tournamenthq_refresh_official_rating();

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table if not exists public.official_payments (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    official_id uuid not null references public.officials(id) on delete cascade,
    assignment_id uuid null references public.official_assignments(id) on delete set null,
    fixture_id uuid null,
    payment_status text not null default 'pending' check (
        payment_status in ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled')
    ),
    match_fee numeric(12,2) not null default 0 check (match_fee >= 0),
    travel_expenses numeric(12,2) not null default 0 check (travel_expenses >= 0),
    accommodation_expenses numeric(12,2) not null default 0 check (accommodation_expenses >= 0),
    bonus_amount numeric(12,2) not null default 0 check (bonus_amount >= 0),
    deductions numeric(12,2) not null default 0 check (deductions >= 0),
    total_amount numeric(12,2) not null default 0,
    payment_reference text null,
    payment_date timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint official_payment_total_non_negative check (total_amount >= 0)
);

create index if not exists official_payments_org_status_idx
    on public.official_payments (organisation_id, payment_status);
create index if not exists official_payments_official_idx
    on public.official_payments (official_id, created_at desc);
create index if not exists official_payments_assignment_idx
    on public.official_payments (assignment_id) where assignment_id is not null;

create or replace function public.tournamenthq_calculate_official_payment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.total_amount := greatest(
        0,
        coalesce(new.match_fee, 0)
        + coalesce(new.travel_expenses, 0)
        + coalesce(new.accommodation_expenses, 0)
        + coalesce(new.bonus_amount, 0)
        - coalesce(new.deductions, 0)
    );
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists official_payments_calculate_total on public.official_payments;
create trigger official_payments_calculate_total
before insert or update on public.official_payments
for each row execute function public.tournamenthq_calculate_official_payment();

-- ---------------------------------------------------------------------------
-- Marketplace profiles
-- ---------------------------------------------------------------------------

create table if not exists public.official_marketplace_profiles (
    official_id uuid primary key references public.officials(id) on delete cascade,
    headline text null,
    summary text null,
    years_experience integer null check (years_experience is null or years_experience >= 0),
    available_for_hire boolean not null default false,
    accepts_last_minute boolean not null default false,
    hourly_rate numeric(12,2) null check (hourly_rate is null or hourly_rate >= 0),
    match_rate numeric(12,2) null check (match_rate is null or match_rate >= 0),
    preferred_sports uuid[] not null default '{}',
    preferred_roles text[] not null default '{}',
    languages text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint official_marketplace_roles_valid check (
        preferred_roles <@ array[
            'referee',
            'assistant_referee',
            'fourth_official',
            'match_commissioner',
            'assessor',
            'observer',
            'timekeeper',
            'scorekeeper',
            'umpire',
            'line_judge',
            'table_official',
            'marshal',
            'technical_delegate',
            'venue_official',
            'medical_official',
            'other'
        ]::text[]
    )
);

create index if not exists official_marketplace_available_idx
    on public.official_marketplace_profiles (available_for_hire, accepts_last_minute);

-- ---------------------------------------------------------------------------
-- Generic updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'official_qualifications',
        'official_compliance',
        'official_availability',
        'official_assignments',
        'official_marketplace_profiles'
    ]
    loop
        execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
        execute format(
            'create trigger %I_set_updated_at before update on public.%I for each row execute function public.tournamenthq_set_updated_at()',
            table_name,
            table_name
        );
    end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ensure child rows cannot be written into a different organisation than
-- their parent official.
-- ---------------------------------------------------------------------------

create or replace function public.tournamenthq_validate_official_organisation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
    parent_organisation_id uuid;
begin
    select official.organisation_id
      into parent_organisation_id
      from public.officials official
     where official.id = new.official_id;

    if parent_organisation_id is null then
        raise exception 'Official % does not exist', new.official_id;
    end if;

    if new.organisation_id <> parent_organisation_id then
        raise exception 'Official and child record must belong to the same organisation';
    end if;

    return new;
end;
$$;

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'official_qualifications',
        'official_compliance',
        'official_availability',
        'official_assignments',
        'official_ratings',
        'official_payments'
    ]
    loop
        execute format('drop trigger if exists %I_validate_organisation on public.%I', table_name, table_name);
        execute format(
            'create trigger %I_validate_organisation before insert or update on public.%I for each row execute function public.tournamenthq_validate_official_organisation()',
            table_name,
            table_name
        );
    end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Add foreign keys to existing TournamentHQ modules only when those tables
-- and expected primary-key columns exist. This lets the migration run before
-- the future Sports entity is introduced.
-- ---------------------------------------------------------------------------

do $$
begin
    if to_regclass('public.sports') is not null then
        if not exists (select 1 from pg_constraint where conname = 'officials_sport_id_fkey') then
            alter table public.officials
                add constraint officials_sport_id_fkey
                foreign key (sport_id) references public.sports(id) on delete set null;
        end if;
        if not exists (select 1 from pg_constraint where conname = 'official_qualifications_sport_id_fkey') then
            alter table public.official_qualifications
                add constraint official_qualifications_sport_id_fkey
                foreign key (sport_id) references public.sports(id) on delete set null;
        end if;
        if not exists (select 1 from pg_constraint where conname = 'official_assignments_sport_id_fkey') then
            alter table public.official_assignments
                add constraint official_assignments_sport_id_fkey
                foreign key (sport_id) references public.sports(id) on delete set null;
        end if;
    end if;

    if to_regclass('public.competitions') is not null
       and not exists (select 1 from pg_constraint where conname = 'official_assignments_competition_id_fkey') then
        alter table public.official_assignments
            add constraint official_assignments_competition_id_fkey
            foreign key (competition_id) references public.competitions(id) on delete cascade;
    end if;

    if to_regclass('public.fixtures') is not null then
        if not exists (select 1 from pg_constraint where conname = 'official_assignments_fixture_id_fkey') then
            alter table public.official_assignments
                add constraint official_assignments_fixture_id_fkey
                foreign key (fixture_id) references public.fixtures(id) on delete cascade;
        end if;
        if not exists (select 1 from pg_constraint where conname = 'official_ratings_fixture_id_fkey') then
            alter table public.official_ratings
                add constraint official_ratings_fixture_id_fkey
                foreign key (fixture_id) references public.fixtures(id) on delete set null;
        end if;
        if not exists (select 1 from pg_constraint where conname = 'official_payments_fixture_id_fkey') then
            alter table public.official_payments
                add constraint official_payments_fixture_id_fkey
                foreign key (fixture_id) references public.fixtures(id) on delete set null;
        end if;
    end if;

    if to_regclass('public.venues') is not null
       and not exists (select 1 from pg_constraint where conname = 'official_assignments_venue_id_fkey') then
        alter table public.official_assignments
            add constraint official_assignments_venue_id_fkey
            foreign key (venue_id) references public.venues(id) on delete set null;
    end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.officials enable row level security;
alter table public.official_qualifications enable row level security;
alter table public.official_compliance enable row level security;
alter table public.official_availability enable row level security;
alter table public.official_assignments enable row level security;
alter table public.official_ratings enable row level security;
alter table public.official_payments enable row level security;
alter table public.official_marketplace_profiles enable row level security;

-- Organisation-scoped tables with a direct organisation_id column.
do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'officials',
        'official_qualifications',
        'official_compliance',
        'official_availability',
        'official_assignments',
        'official_ratings',
        'official_payments'
    ]
    loop
        execute format('drop policy if exists %I_org_select on public.%I', table_name, table_name);
        execute format('drop policy if exists %I_org_insert on public.%I', table_name, table_name);
        execute format('drop policy if exists %I_org_update on public.%I', table_name, table_name);
        execute format('drop policy if exists %I_org_delete on public.%I', table_name, table_name);

        execute format(
            'create policy %I_org_select on public.%I for select to authenticated using (public.tournamenthq_is_organisation_member(organisation_id))',
            table_name,
            table_name
        );
        execute format(
            'create policy %I_org_insert on public.%I for insert to authenticated with check (public.tournamenthq_is_organisation_member(organisation_id))',
            table_name,
            table_name
        );
        execute format(
            'create policy %I_org_update on public.%I for update to authenticated using (public.tournamenthq_is_organisation_member(organisation_id)) with check (public.tournamenthq_is_organisation_member(organisation_id))',
            table_name,
            table_name
        );
        execute format(
            'create policy %I_org_delete on public.%I for delete to authenticated using (public.tournamenthq_is_organisation_member(organisation_id))',
            table_name,
            table_name
        );
    end loop;
end;
$$;

-- Marketplace profiles inherit organisation access through their official.
drop policy if exists official_marketplace_profiles_org_select on public.official_marketplace_profiles;
drop policy if exists official_marketplace_profiles_org_insert on public.official_marketplace_profiles;
drop policy if exists official_marketplace_profiles_org_update on public.official_marketplace_profiles;
drop policy if exists official_marketplace_profiles_org_delete on public.official_marketplace_profiles;

create policy official_marketplace_profiles_org_select
on public.official_marketplace_profiles
for select to authenticated
using (
    exists (
        select 1
        from public.officials official
        where official.id = official_marketplace_profiles.official_id
          and public.tournamenthq_is_organisation_member(official.organisation_id)
    )
);

create policy official_marketplace_profiles_org_insert
on public.official_marketplace_profiles
for insert to authenticated
with check (
    exists (
        select 1
        from public.officials official
        where official.id = official_marketplace_profiles.official_id
          and public.tournamenthq_is_organisation_member(official.organisation_id)
    )
);

create policy official_marketplace_profiles_org_update
on public.official_marketplace_profiles
for update to authenticated
using (
    exists (
        select 1
        from public.officials official
        where official.id = official_marketplace_profiles.official_id
          and public.tournamenthq_is_organisation_member(official.organisation_id)
    )
)
with check (
    exists (
        select 1
        from public.officials official
        where official.id = official_marketplace_profiles.official_id
          and public.tournamenthq_is_organisation_member(official.organisation_id)
    )
);

create policy official_marketplace_profiles_org_delete
on public.official_marketplace_profiles
for delete to authenticated
using (
    exists (
        select 1
        from public.officials official
        where official.id = official_marketplace_profiles.official_id
          and public.tournamenthq_is_organisation_member(official.organisation_id)
    )
);

-- ---------------------------------------------------------------------------
-- Safe public marketplace projection
-- ---------------------------------------------------------------------------

create or replace view public.public_official_marketplace
with (security_invoker = false)
as
select
    official.id,
    official.sport_id,
    official.first_name,
    official.last_name,
    official.full_name,
    official.role,
    official.profile_photo_url,
    official.biography,
    official.nationality,
    official.county,
    official.city,
    official.travel_preference,
    official.maximum_travel_distance_km,
    official.average_rating,
    official.total_ratings,
    official.completed_matches,
    official.completed_tournaments,
    profile.headline,
    profile.summary,
    profile.years_experience,
    profile.available_for_hire,
    profile.accepts_last_minute,
    profile.hourly_rate,
    profile.match_rate,
    profile.preferred_sports,
    profile.preferred_roles,
    profile.languages
from public.officials official
left join public.official_marketplace_profiles profile
    on profile.official_id = official.id
where official.marketplace_visibility = 'public'
  and official.status = 'active'
  and official.verification_status = 'verified'
  and coalesce(profile.available_for_hire, false) = true;

revoke all on public.public_official_marketplace from public;
grant select on public.public_official_marketplace to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table grants (RLS still controls access)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.officials to authenticated;
grant select, insert, update, delete on public.official_qualifications to authenticated;
grant select, insert, update, delete on public.official_compliance to authenticated;
grant select, insert, update, delete on public.official_availability to authenticated;
grant select, insert, update, delete on public.official_assignments to authenticated;
grant select, insert, update, delete on public.official_ratings to authenticated;
grant select, insert, update, delete on public.official_payments to authenticated;
grant select, insert, update, delete on public.official_marketplace_profiles to authenticated;

commit;
