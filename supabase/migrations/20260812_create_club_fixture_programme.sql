-- TournamentHQ
-- Club Fixture Programme foundation
-- Designed for organisations with organisation_type = 'club'
-- Safe: does not alter the existing competition-scoped fixtures table.

create table if not exists public.club_seasons (
                                                   id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    name text not null,
    season_label text not null,
    start_date date null,
    end_date date null,
    status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'archived')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

create index if not exists idx_club_seasons_organisation_id
    on public.club_seasons (organisation_id);

create unique index if not exists uq_club_seasons_org_label
    on public.club_seasons (organisation_id, season_label);


create table if not exists public.club_opponents (
                                                     id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    name text not null,
    contact_name text null,
    contact_phone text null,
    contact_email text null,
    notes text null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

create index if not exists idx_club_opponents_organisation_id
    on public.club_opponents (organisation_id);

create unique index if not exists uq_club_opponents_org_name
    on public.club_opponents (organisation_id, lower(name));


create table if not exists public.club_fixture_slots (
                                                         id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    season_id uuid not null references public.club_seasons(id) on delete cascade,
    fixture_date date not null,
    slot_status text not null default 'available'
    check (
              slot_status in (
              'available',
              'proposed',
              'confirmed',
              'played',
              'cancelled',
              'unavailable'
                             )
    ),
    slot_label text null,
    reason text null,
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

create index if not exists idx_club_fixture_slots_season_date
    on public.club_fixture_slots (season_id, fixture_date);

create index if not exists idx_club_fixture_slots_organisation_id
    on public.club_fixture_slots (organisation_id);


create table if not exists public.club_fixtures (
                                                    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    season_id uuid not null references public.club_seasons(id) on delete cascade,
    slot_id uuid null references public.club_fixture_slots(id) on delete set null,
    opponent_id uuid null references public.club_opponents(id) on delete set null,

    fixture_date date not null,
    kickoff_time time null,

    home_away text not null default 'home'
    check (home_away in ('home', 'away', 'neutral')),

    fixture_type text not null default 'friendly'
    check (fixture_type in ('friendly', 'league', 'cup', 'tournament', 'other')),

    venue_name text null,
    venue_address text null,

    status text not null default 'scheduled'
    check (
              status in (
              'proposed',
              'scheduled',
              'confirmed',
              'played',
              'cancelled',
              'postponed',
              'abandoned'
                        )
    ),

    opponent_contact_name text null,
    opponent_contact_phone text null,
    opponent_contact_email text null,

    referee_name text null,
    notes text null,
    published boolean not null default false,

    cancellation_reason text null,
    replaced_fixture_id uuid null references public.club_fixtures(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

create index if not exists idx_club_fixtures_season_date
    on public.club_fixtures (season_id, fixture_date);

create index if not exists idx_club_fixtures_organisation_id
    on public.club_fixtures (organisation_id);

create index if not exists idx_club_fixtures_opponent_id
    on public.club_fixtures (opponent_id);

create unique index if not exists uq_club_fixture_slot_active
    on public.club_fixtures (slot_id)
    where slot_id is not null
    and status not in ('cancelled', 'postponed');


-- -------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------

alter table public.club_seasons enable row level security;
alter table public.club_opponents enable row level security;
alter table public.club_fixture_slots enable row level security;
alter table public.club_fixtures enable row level security;


drop policy if exists "club_seasons_member_select" on public.club_seasons;
create policy "club_seasons_member_select"
on public.club_seasons
for select
                    to authenticated
                    using (
                    exists (
                    select 1
                    from public.organisation_memberships om
                    where om.organisation_id = club_seasons.organisation_id
                    and om.user_id = auth.uid()
                    and om.active = true
                    )
                    or exists (
                    select 1
                    from public.platform_admins pa
                    where pa.user_id = auth.uid()
                    and pa.active = true
                    )
                    );

drop policy if exists "club_seasons_member_write" on public.club_seasons;
create policy "club_seasons_member_write"
on public.club_seasons
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_seasons.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
)
with check (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_seasons.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);


drop policy if exists "club_opponents_member_select" on public.club_opponents;
create policy "club_opponents_member_select"
on public.club_opponents
for select
                                to authenticated
                                using (
                                exists (
                                select 1
                                from public.organisation_memberships om
                                where om.organisation_id = club_opponents.organisation_id
                                and om.user_id = auth.uid()
                                and om.active = true
                                )
                                or exists (
                                select 1
                                from public.platform_admins pa
                                where pa.user_id = auth.uid()
                                and pa.active = true
                                )
                                );

drop policy if exists "club_opponents_member_write" on public.club_opponents;
create policy "club_opponents_member_write"
on public.club_opponents
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_opponents.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
)
with check (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_opponents.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);


drop policy if exists "club_fixture_slots_member_select" on public.club_fixture_slots;
create policy "club_fixture_slots_member_select"
on public.club_fixture_slots
for select
                                to authenticated
                                using (
                                exists (
                                select 1
                                from public.organisation_memberships om
                                where om.organisation_id = club_fixture_slots.organisation_id
                                and om.user_id = auth.uid()
                                and om.active = true
                                )
                                or exists (
                                select 1
                                from public.platform_admins pa
                                where pa.user_id = auth.uid()
                                and pa.active = true
                                )
                                );

drop policy if exists "club_fixture_slots_member_write" on public.club_fixture_slots;
create policy "club_fixture_slots_member_write"
on public.club_fixture_slots
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_fixture_slots.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
)
with check (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_fixture_slots.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);


drop policy if exists "club_fixtures_member_select" on public.club_fixtures;
create policy "club_fixtures_member_select"
on public.club_fixtures
for select
                                to authenticated
                                using (
                                exists (
                                select 1
                                from public.organisation_memberships om
                                where om.organisation_id = club_fixtures.organisation_id
                                and om.user_id = auth.uid()
                                and om.active = true
                                )
                                or exists (
                                select 1
                                from public.platform_admins pa
                                where pa.user_id = auth.uid()
                                and pa.active = true
                                )
                                );

drop policy if exists "club_fixtures_member_write" on public.club_fixtures;
create policy "club_fixtures_member_write"
on public.club_fixtures
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_fixtures.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
)
with check (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_fixtures.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);


-- Public read is intentionally limited to published fixtures only.
drop policy if exists "club_fixtures_public_select" on public.club_fixtures;
create policy "club_fixtures_public_select"
on public.club_fixtures
for select
                                to anon
                                using (
                                published = true
                                and exists (
                                select 1
                                from public.organisations o
                                where o.id = club_fixtures.organisation_id
                                and o.status = 'active'
                                and o.public_site_enabled = true
                                )
                                );


comment on table public.club_seasons is
'Season containers for club/team organisations that manage their own fixture programmes rather than administering a competition.';

comment on table public.club_opponents is
'External opponents used by club/team organisations. Opponents do not need a TournamentHQ account or full club record.';

comment on table public.club_fixture_slots is
'Season calendar slots. A slot may be available for a fixture, confirmed, played, cancelled or deliberately unavailable such as holidays/breaks.';

comment on table public.club_fixtures is
'Club-managed fixtures independent of the competition-scoped fixtures table. Supports replacement opponents, cancellations, officials and public publishing.';