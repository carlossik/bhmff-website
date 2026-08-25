-- TournamentHQ emergency regression recovery
-- Restores the standalone club fixture foundation used by Match Centre and RSVP.
-- Safe to run repeatedly. It does not alter the competition-scoped public.fixtures table.

begin;

create table if not exists public.club_seasons (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    name text not null,
    season_label text not null,
    start_date date,
    end_date date,
    status text not null default 'active'
        check (status in ('draft', 'active', 'completed', 'archived')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_club_seasons_org_label
    on public.club_seasons (organisation_id, season_label);

create table if not exists public.club_opponents (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    name text not null,
    contact_name text,
    contact_phone text,
    contact_email text,
    notes text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_club_opponents_org_name
    on public.club_opponents (organisation_id, lower(name));

create table if not exists public.club_team_seasons (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    season_id uuid not null references public.club_seasons(id) on delete cascade,
    team_id uuid not null references public.teams(id) on delete restrict,
    status text not null default 'active'
        check (status in ('active', 'inactive', 'archived')),
    payment_model text not null default 'none'
        check (payment_model in ('none', 'matchday', 'monthly', 'hybrid')),
    monthly_fee_amount numeric(10,2) not null default 0,
    matchday_sub_amount numeric(10,2) not null default 0,
    monthly_due_day integer not null default 1,
    yellow_card_fine_amount numeric(10,2) not null default 0,
    red_card_fine_amount numeric(10,2) not null default 0,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_team_seasons_org_season_team_key
        unique (organisation_id, season_id, team_id)
);

create unique index if not exists club_team_seasons_org_season_team_idx
    on public.club_team_seasons (organisation_id, season_id, team_id);

create table if not exists public.club_fixture_slots (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    season_id uuid not null references public.club_seasons(id) on delete cascade,
    team_id uuid references public.teams(id) on delete restrict,
    fixture_date date not null,
    slot_status text not null default 'available'
        check (slot_status in ('available','proposed','confirmed','played','cancelled','unavailable')),
    slot_label text,
    reason text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.club_fixture_slots
    add column if not exists team_id uuid;

create table if not exists public.club_fixtures (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    season_id uuid not null references public.club_seasons(id) on delete cascade,
    team_id uuid references public.teams(id) on delete restrict,
    slot_id uuid references public.club_fixture_slots(id) on delete set null,
    opponent_id uuid references public.club_opponents(id) on delete set null,
    fixture_date date not null,
    kickoff_time time,
    home_away text not null default 'home'
        check (home_away in ('home','away','neutral')),
    fixture_type text not null default 'friendly'
        check (fixture_type in ('friendly','league','cup','tournament','other')),
    venue_name text,
    venue_address text,
    status text not null default 'scheduled'
        check (status in ('proposed','scheduled','confirmed','played','cancelled','postponed','abandoned')),
    opponent_contact_name text,
    opponent_contact_phone text,
    opponent_contact_email text,
    referee_name text,
    notes text,
    published boolean not null default false,
    cancellation_reason text,
    replaced_fixture_id uuid references public.club_fixtures(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.club_fixtures
    add column if not exists team_id uuid;

create index if not exists idx_club_fixtures_org_season_team_date
    on public.club_fixtures (organisation_id, season_id, team_id, fixture_date);

create index if not exists idx_club_fixtures_opponent_id
    on public.club_fixtures (opponent_id);

create index if not exists idx_club_fixture_slots_org_season_team_date
    on public.club_fixture_slots (organisation_id, season_id, team_id, fixture_date);

-- Recover team-season links when teams and seasons already exist.
insert into public.club_team_seasons (
    organisation_id,
    season_id,
    team_id,
    status
)
select
    cs.organisation_id,
    cs.id,
    t.id,
    case
        when cs.status = 'active' then 'active'
        when cs.status in ('completed', 'archived') then 'archived'
        else 'inactive'
    end
from public.club_seasons cs
join public.teams t
  on t.organisation_id = cs.organisation_id
join public.organisations o
  on o.id = cs.organisation_id
 and o.organisation_type = 'club'
on conflict (organisation_id, season_id, team_id) do nothing;

-- Backfill legacy fixtures only when a season has exactly one linked team.
with resolved as (
    select
        organisation_id,
        season_id,
        min(team_id::text)::uuid as team_id
    from public.club_team_seasons
    where status <> 'archived'
    group by organisation_id, season_id
    having count(*) = 1
)
update public.club_fixtures f
set team_id = r.team_id
from resolved r
where f.team_id is null
  and r.organisation_id = f.organisation_id
  and r.season_id = f.season_id;

with resolved as (
    select
        organisation_id,
        season_id,
        min(team_id::text)::uuid as team_id
    from public.club_team_seasons
    where status <> 'archived'
    group by organisation_id, season_id
    having count(*) = 1
)
update public.club_fixture_slots s
set team_id = r.team_id
from resolved r
where s.team_id is null
  and r.organisation_id = s.organisation_id
  and r.season_id = s.season_id;

alter table public.club_seasons enable row level security;
alter table public.club_opponents enable row level security;
alter table public.club_team_seasons enable row level security;
alter table public.club_fixture_slots enable row level security;
alter table public.club_fixtures enable row level security;

-- Club fixtures: members can read; authorised managers/platform admins can write.
drop policy if exists club_fixtures_member_select on public.club_fixtures;
create policy club_fixtures_member_select
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

drop policy if exists club_fixtures_member_write on public.club_fixtures;
create policy club_fixtures_member_write
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
          and om.role in ('competition_manager','super_admin')
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
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

drop policy if exists club_fixtures_public_select on public.club_fixtures;
create policy club_fixtures_public_select
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

-- Opponent directory.
drop policy if exists club_opponents_member_select on public.club_opponents;
create policy club_opponents_member_select
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
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists club_opponents_member_write on public.club_opponents;
create policy club_opponents_member_write
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
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
)
with check (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_opponents.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

-- Team-season links and seasons remain visible to organisation members.
drop policy if exists club_team_seasons_member_select on public.club_team_seasons;
create policy club_team_seasons_member_select
on public.club_team_seasons
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_team_seasons.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists club_seasons_member_select on public.club_seasons;
create policy club_seasons_member_select
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
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);


drop policy if exists club_seasons_member_write on public.club_seasons;
create policy club_seasons_member_write
on public.club_seasons
for all
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_seasons.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
)
with check (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_seasons.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists club_team_seasons_member_write on public.club_team_seasons;
create policy club_team_seasons_member_write
on public.club_team_seasons
for all
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_team_seasons.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
)
with check (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_team_seasons.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists club_fixture_slots_member_select on public.club_fixture_slots;
create policy club_fixture_slots_member_select
on public.club_fixture_slots
for select
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_fixture_slots.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists club_fixture_slots_member_write on public.club_fixture_slots;
create policy club_fixture_slots_member_write
on public.club_fixture_slots
for all
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_fixture_slots.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
)
with check (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_fixture_slots.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager','super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

commit;

-- Force PostgREST to refresh newly restored table metadata.
notify pgrst, 'reload schema';
