-- TournamentHQ Enterprise
-- Phase 2: Multi-team club operations, payment policies and Match Centre foundation
-- Date: 2026-08-14
--
-- This migration is designed for the verified TournamentHQ schema.
-- It preserves existing single-team club data and the legacy club_squad_members.subs_* columns.
-- Those legacy columns are intentionally NOT dropped in this phase.
--
-- Key outcomes:
--   1. Existing club organisations receive one canonical default team where they currently have none.
--   2. Teams are linked to club seasons through club_team_seasons.
--   3. club_fixtures, club_fixture_slots and club_squad_members become team-aware.
--   4. Team-season payment policy supports none / matchday / monthly / hybrid.
--   5. A private player-charge ledger supports monthly fees, matchday subs and card fines.
--   6. Match Centre foundations support match squads and football events.
--   7. Existing one-team code remains compatible because a trigger can infer the only team for a season.
--
-- IMPORTANT:
--   * Financial records have NO anonymous/public RLS policy.
--   * Public Match Centre policies expose only explicitly published football information.
--   * Legacy subs_amount/subs_status stay in place until the application has fully migrated.

begin;

-- ---------------------------------------------------------------------------
-- 1. Team-season operating model
-- ---------------------------------------------------------------------------

create table if not exists public.club_team_seasons (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid not null
        references public.club_seasons(id) on delete cascade,
    team_id uuid not null
        references public.teams(id) on delete restrict,

    status text not null default 'active'
        check (status in ('active', 'inactive', 'archived')),

    payment_model text not null default 'none'
        check (payment_model in ('none', 'matchday', 'monthly', 'hybrid')),

    monthly_fee_amount numeric(10,2) not null default 0
        check (monthly_fee_amount >= 0),

    matchday_sub_amount numeric(10,2) not null default 0
        check (matchday_sub_amount >= 0),

    monthly_due_day integer not null default 1
        check (monthly_due_day between 1 and 28),

    yellow_card_fine_amount numeric(10,2) not null default 0
        check (yellow_card_fine_amount >= 0),

    red_card_fine_amount numeric(10,2) not null default 0
        check (red_card_fine_amount >= 0),

    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_team_seasons_org_season_team_key
        unique (organisation_id, season_id, team_id)
);

create index if not exists idx_club_team_seasons_org
    on public.club_team_seasons (organisation_id);

create index if not exists idx_club_team_seasons_season
    on public.club_team_seasons (season_id);

create index if not exists idx_club_team_seasons_team
    on public.club_team_seasons (team_id);

create index if not exists idx_club_team_seasons_org_status
    on public.club_team_seasons (organisation_id, status);

-- ---------------------------------------------------------------------------
-- 2. Safe single-team bootstrap for existing club organisations
-- ---------------------------------------------------------------------------
-- Verified current state: existing organisation_type='club' organisations have
-- no rows in public.teams. We create one canonical team only where an
-- organisation currently has no teams at all.

insert into public.teams (
    name,
    organisation_id,
    club_id,
    published,
    participation_status
)
select
    o.name,
    o.id,
    null,
    true,
    'confirmed'
from public.organisations o
where o.organisation_type = 'club'
  and not exists (
      select 1
      from public.teams t
      where t.organisation_id = o.id
  );

-- Link seasons only for club organisations that currently have exactly one team.
-- This preserves legacy one-team behaviour and deliberately avoids guessing for
-- any organisation that may already have multiple teams in the future.

with single_team_organisations as (
    select
        t.organisation_id,
        min(t.id::text)::uuid as team_id
    from public.teams t
    join public.organisations o
      on o.id = t.organisation_id
     and o.organisation_type = 'club'
    group by t.organisation_id
    having count(*) = 1
)
insert into public.club_team_seasons (
    organisation_id,
    season_id,
    team_id,
    status
)
select
    cs.organisation_id,
    cs.id,
    sto.team_id,
    case
        when cs.status = 'active' then 'active'
        when cs.status in ('completed', 'archived') then 'archived'
        else 'inactive'
    end
from public.club_seasons cs
join single_team_organisations sto
  on sto.organisation_id = cs.organisation_id
on conflict (organisation_id, season_id, team_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Add the team dimension to existing club operational tables
-- ---------------------------------------------------------------------------

alter table public.club_fixtures
    add column if not exists team_id uuid;

alter table public.club_fixture_slots
    add column if not exists team_id uuid;

alter table public.club_squad_members
    add column if not exists team_id uuid;

-- Backfill only when the organisation/season resolves to exactly one
-- club_team_seasons row.

with resolved as (
    select
        organisation_id,
        season_id,
        min(team_id::text)::uuid as team_id
    from public.club_team_seasons
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
    group by organisation_id, season_id
    having count(*) = 1
)
update public.club_fixture_slots s
set team_id = r.team_id
from resolved r
where s.team_id is null
  and r.organisation_id = s.organisation_id
  and r.season_id = s.season_id;

with resolved as (
    select
        organisation_id,
        season_id,
        min(team_id::text)::uuid as team_id
    from public.club_team_seasons
    group by organisation_id, season_id
    having count(*) = 1
)
update public.club_squad_members sm
set team_id = r.team_id
from resolved r
where sm.team_id is null
  and r.organisation_id = sm.organisation_id
  and r.season_id = sm.season_id;

-- Compatibility trigger:
-- Older one-team application code does not yet send team_id. While a season has
-- exactly one configured team, infer it automatically. When a season has more
-- than one team, the application MUST send team_id and receives a clear error.

create or replace function public.club_resolve_team_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
    resolved_team_id uuid;
    team_count integer;
begin
    if new.team_id is not null then
        return new;
    end if;

    select
        count(*),
        min(cts.team_id)
    into
        team_count,
        resolved_team_id
    from public.club_team_seasons cts
    where cts.organisation_id = new.organisation_id
      and cts.season_id = new.season_id
      and cts.status <> 'archived';

    if team_count = 1 then
        new.team_id := resolved_team_id;
        return new;
    end if;

    if team_count = 0 then
        raise exception
            'No team is configured for organisation %, season %. Configure a team for this season first.',
            new.organisation_id,
            new.season_id;
    end if;

    raise exception
        'team_id is required because season % has multiple teams.',
        new.season_id;
end;
$$;

drop trigger if exists trg_club_fixtures_resolve_team
    on public.club_fixtures;

create trigger trg_club_fixtures_resolve_team
before insert or update of organisation_id, season_id, team_id
on public.club_fixtures
for each row
execute function public.club_resolve_team_id();

drop trigger if exists trg_club_fixture_slots_resolve_team
    on public.club_fixture_slots;

create trigger trg_club_fixture_slots_resolve_team
before insert or update of organisation_id, season_id, team_id
on public.club_fixture_slots
for each row
execute function public.club_resolve_team_id();

drop trigger if exists trg_club_squad_members_resolve_team
    on public.club_squad_members;

create trigger trg_club_squad_members_resolve_team
before insert or update of organisation_id, season_id, team_id
on public.club_squad_members
for each row
execute function public.club_resolve_team_id();

-- Enforce the verified team-season relationship.
-- Constraints are added idempotently.

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'club_fixtures_team_season_fkey'
          and conrelid = 'public.club_fixtures'::regclass
    ) then
        alter table public.club_fixtures
            add constraint club_fixtures_team_season_fkey
            foreign key (organisation_id, season_id, team_id)
            references public.club_team_seasons (
                organisation_id,
                season_id,
                team_id
            )
            on delete restrict;
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'club_fixture_slots_team_season_fkey'
          and conrelid = 'public.club_fixture_slots'::regclass
    ) then
        alter table public.club_fixture_slots
            add constraint club_fixture_slots_team_season_fkey
            foreign key (organisation_id, season_id, team_id)
            references public.club_team_seasons (
                organisation_id,
                season_id,
                team_id
            )
            on delete restrict;
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'club_squad_members_team_season_fkey'
          and conrelid = 'public.club_squad_members'::regclass
    ) then
        alter table public.club_squad_members
            add constraint club_squad_members_team_season_fkey
            foreign key (organisation_id, season_id, team_id)
            references public.club_team_seasons (
                organisation_id,
                season_id,
                team_id
            )
            on delete restrict;
    end if;
end
$$;

-- All verified legacy rows should now have a team. Keep this check explicit so
-- the migration fails rather than silently producing partially scoped data.

do $$
begin
    if exists (
        select 1 from public.club_fixtures where team_id is null
    ) then
        raise exception 'Cannot make club_fixtures.team_id required: unresolved legacy fixtures exist.';
    end if;

    if exists (
        select 1 from public.club_fixture_slots where team_id is null
    ) then
        raise exception 'Cannot make club_fixture_slots.team_id required: unresolved legacy fixture slots exist.';
    end if;

    if exists (
        select 1 from public.club_squad_members where team_id is null
    ) then
        raise exception 'Cannot make club_squad_members.team_id required: unresolved legacy squad members exist.';
    end if;
end
$$;

alter table public.club_fixtures
    alter column team_id set not null;

alter table public.club_fixture_slots
    alter column team_id set not null;

alter table public.club_squad_members
    alter column team_id set not null;

create index if not exists idx_club_fixtures_org_season_team_date
    on public.club_fixtures (
        organisation_id,
        season_id,
        team_id,
        fixture_date
    );

create index if not exists idx_club_fixture_slots_org_season_team_date
    on public.club_fixture_slots (
        organisation_id,
        season_id,
        team_id,
        fixture_date
    );

create index if not exists idx_club_squad_members_org_season_team
    on public.club_squad_members (
        organisation_id,
        season_id,
        team_id
    );

-- Existing uniqueness prevented a player from appearing for more than one team
-- in the same season. Multi-team clubs need the team dimension in that key.

alter table public.club_squad_members
    drop constraint if exists club_squad_members_season_id_player_id_key;

create unique index if not exists
    club_squad_members_season_team_player_key
on public.club_squad_members (
    season_id,
    team_id,
    player_id
);

-- ---------------------------------------------------------------------------
-- 4. Match Centre: one match squad per fixture
-- ---------------------------------------------------------------------------

create table if not exists public.club_match_squads (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid not null
        references public.club_seasons(id) on delete cascade,
    team_id uuid not null,
    fixture_id uuid not null
        references public.club_fixtures(id) on delete cascade,

    status text not null default 'draft'
        check (status in ('draft', 'confirmed', 'completed')),

    published boolean not null default false,
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_match_squads_fixture_key unique (fixture_id),

    constraint club_match_squads_team_season_fkey
        foreign key (organisation_id, season_id, team_id)
        references public.club_team_seasons (
            organisation_id,
            season_id,
            team_id
        )
        on delete restrict
);

create index if not exists idx_club_match_squads_org_season_team
    on public.club_match_squads (
        organisation_id,
        season_id,
        team_id
    );

create index if not exists idx_club_match_squads_fixture
    on public.club_match_squads (fixture_id);

create table if not exists public.club_match_squad_members (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    match_squad_id uuid not null
        references public.club_match_squads(id) on delete cascade,
    squad_member_id uuid not null
        references public.club_squad_members(id) on delete restrict,

    selection_role text not null default 'starter'
        check (selection_role in ('starter', 'substitute')),

    appearance_status text not null default 'selected'
        check (
            appearance_status in (
                'selected',
                'played',
                'unused_substitute',
                'absent'
            )
        ),

    squad_number integer
        check (
            squad_number is null
            or (squad_number >= 0 and squad_number <= 999)
        ),

    position text,
    player_name text not null,
    is_captain boolean not null default false,
    is_goalkeeper boolean not null default false,
    sort_order integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_match_squad_members_member_key
        unique (match_squad_id, squad_member_id)
);

create index if not exists idx_club_match_squad_members_org
    on public.club_match_squad_members (organisation_id);

create index if not exists idx_club_match_squad_members_squad
    on public.club_match_squad_members (match_squad_id);

create index if not exists idx_club_match_squad_members_member
    on public.club_match_squad_members (squad_member_id);

-- ---------------------------------------------------------------------------
-- 5. Match Centre football events
-- ---------------------------------------------------------------------------

create table if not exists public.club_match_events (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid not null
        references public.club_seasons(id) on delete cascade,
    team_id uuid not null,
    fixture_id uuid not null
        references public.club_fixtures(id) on delete cascade,

    match_squad_member_id uuid
        references public.club_match_squad_members(id) on delete set null,

    related_match_squad_member_id uuid
        references public.club_match_squad_members(id) on delete set null,

    event_type text not null
        check (
            event_type in (
                'goal',
                'own_goal',
                'penalty_goal',
                'penalty_miss',
                'assist',
                'yellow_card',
                'red_card',
                'substitution',
                'note'
            )
        ),

    minute integer
        check (minute is null or minute >= 0),

    added_time integer
        check (added_time is null or added_time >= 0),

    player_name text,
    related_player_name text,
    notes text,

    published boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_match_events_team_season_fkey
        foreign key (organisation_id, season_id, team_id)
        references public.club_team_seasons (
            organisation_id,
            season_id,
            team_id
        )
        on delete restrict
);

create index if not exists idx_club_match_events_fixture
    on public.club_match_events (fixture_id, minute);

create index if not exists idx_club_match_events_org_season_team
    on public.club_match_events (
        organisation_id,
        season_id,
        team_id
    );

create index if not exists idx_club_match_events_member
    on public.club_match_events (match_squad_member_id);

-- ---------------------------------------------------------------------------
-- 6. Private player charges ledger
-- ---------------------------------------------------------------------------

create table if not exists public.club_player_charges (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid not null
        references public.club_seasons(id) on delete cascade,
    team_id uuid not null,
    player_id uuid not null
        references public.club_players(id) on delete restrict,

    squad_member_id uuid
        references public.club_squad_members(id) on delete set null,

    fixture_id uuid
        references public.club_fixtures(id) on delete cascade,

    match_event_id uuid
        references public.club_match_events(id) on delete set null,

    charge_type text not null
        check (
            charge_type in (
                'sign_on',
                'monthly_fee',
                'matchday_sub',
                'yellow_card_fine',
                'red_card_fine',
                'custom'
            )
        ),

    billing_period date,
    description text,

    amount_due numeric(10,2) not null
        check (amount_due >= 0),

    amount_paid numeric(10,2) not null default 0
        check (amount_paid >= 0),

    payment_status text not null default 'due'
        check (
            payment_status in (
                'not_due',
                'due',
                'part_paid',
                'paid',
                'waived'
            )
        ),

    due_date date,
    paid_at timestamptz,
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_player_charges_amount_check
        check (amount_paid <= amount_due),

    constraint club_player_charges_team_season_fkey
        foreign key (organisation_id, season_id, team_id)
        references public.club_team_seasons (
            organisation_id,
            season_id,
            team_id
        )
        on delete restrict
);

create index if not exists idx_club_player_charges_org_team_status
    on public.club_player_charges (
        organisation_id,
        team_id,
        payment_status
    );

create index if not exists idx_club_player_charges_player
    on public.club_player_charges (
        player_id,
        created_at desc
    );

create index if not exists idx_club_player_charges_fixture
    on public.club_player_charges (fixture_id)
    where fixture_id is not null;

create index if not exists idx_club_player_charges_period
    on public.club_player_charges (
        team_id,
        billing_period
    )
    where billing_period is not null;

-- Prevent duplicate generated monthly charges for the same player/team/month.
create unique index if not exists
    club_player_charges_monthly_unique
on public.club_player_charges (
    organisation_id,
    season_id,
    team_id,
    player_id,
    billing_period
)
where charge_type = 'monthly_fee'
  and billing_period is not null;

-- Prevent duplicate matchday subs for one player in one fixture.
create unique index if not exists
    club_player_charges_matchday_unique
on public.club_player_charges (
    organisation_id,
    team_id,
    player_id,
    fixture_id
)
where charge_type = 'matchday_sub'
  and fixture_id is not null;

-- One automatic card fine of a given type per match event.
create unique index if not exists
    club_player_charges_match_event_unique
on public.club_player_charges (
    organisation_id,
    match_event_id,
    charge_type
)
where match_event_id is not null
  and charge_type in ('yellow_card_fine', 'red_card_fine');

-- ---------------------------------------------------------------------------
-- 7. Shared updated_at trigger for new Phase 2 tables
-- ---------------------------------------------------------------------------

create or replace function public.club_operations_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_club_team_seasons_updated_at
    on public.club_team_seasons;
create trigger trg_club_team_seasons_updated_at
before update on public.club_team_seasons
for each row
execute function public.club_operations_set_updated_at();

drop trigger if exists trg_club_match_squads_updated_at
    on public.club_match_squads;
create trigger trg_club_match_squads_updated_at
before update on public.club_match_squads
for each row
execute function public.club_operations_set_updated_at();

drop trigger if exists trg_club_match_squad_members_updated_at
    on public.club_match_squad_members;
create trigger trg_club_match_squad_members_updated_at
before update on public.club_match_squad_members
for each row
execute function public.club_operations_set_updated_at();

drop trigger if exists trg_club_match_events_updated_at
    on public.club_match_events;
create trigger trg_club_match_events_updated_at
before update on public.club_match_events
for each row
execute function public.club_operations_set_updated_at();

drop trigger if exists trg_club_player_charges_updated_at
    on public.club_player_charges;
create trigger trg_club_player_charges_updated_at
before update on public.club_player_charges
for each row
execute function public.club_operations_set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.club_team_seasons enable row level security;
alter table public.club_match_squads enable row level security;
alter table public.club_match_squad_members enable row level security;
alter table public.club_match_events enable row level security;
alter table public.club_player_charges enable row level security;

-- Helper predicates are deliberately written inline to match the verified
-- TournamentHQ club_* policy architecture.

-- club_team_seasons ----------------------------------------------------------

drop policy if exists club_team_seasons_member_select
    on public.club_team_seasons;
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
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    )
);

drop policy if exists club_team_seasons_member_write
    on public.club_team_seasons;
create policy club_team_seasons_member_write
on public.club_team_seasons
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_team_seasons.organisation_id
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
        where om.organisation_id = club_team_seasons.organisation_id
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

-- club_match_squads ----------------------------------------------------------

drop policy if exists club_match_squads_member_select
    on public.club_match_squads;
create policy club_match_squads_member_select
on public.club_match_squads
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_match_squads.organisation_id
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

drop policy if exists club_match_squads_member_write
    on public.club_match_squads;
create policy club_match_squads_member_write
on public.club_match_squads
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_match_squads.organisation_id
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
        where om.organisation_id = club_match_squads.organisation_id
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

drop policy if exists club_match_squads_public_select
    on public.club_match_squads;
create policy club_match_squads_public_select
on public.club_match_squads
for select
to anon, authenticated
using (
    published = true
    and exists (
        select 1
        from public.club_fixtures f
        join public.organisations o
          on o.id = f.organisation_id
        where f.id = club_match_squads.fixture_id
          and f.published = true
          and o.status = 'active'
          and o.public_site_enabled = true
    )
);

-- club_match_squad_members ---------------------------------------------------

drop policy if exists club_match_squad_members_member_select
    on public.club_match_squad_members;
create policy club_match_squad_members_member_select
on public.club_match_squad_members
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_match_squad_members.organisation_id
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

drop policy if exists club_match_squad_members_member_write
    on public.club_match_squad_members;
create policy club_match_squad_members_member_write
on public.club_match_squad_members
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_match_squad_members.organisation_id
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
        where om.organisation_id = club_match_squad_members.organisation_id
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

drop policy if exists club_match_squad_members_public_select
    on public.club_match_squad_members;
create policy club_match_squad_members_public_select
on public.club_match_squad_members
for select
to anon, authenticated
using (
    exists (
        select 1
        from public.club_match_squads ms
        join public.club_fixtures f
          on f.id = ms.fixture_id
        join public.organisations o
          on o.id = ms.organisation_id
        where ms.id = club_match_squad_members.match_squad_id
          and ms.published = true
          and f.published = true
          and o.status = 'active'
          and o.public_site_enabled = true
    )
);

-- club_match_events ----------------------------------------------------------

drop policy if exists club_match_events_member_select
    on public.club_match_events;
create policy club_match_events_member_select
on public.club_match_events
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_match_events.organisation_id
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

drop policy if exists club_match_events_member_write
    on public.club_match_events;
create policy club_match_events_member_write
on public.club_match_events
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_match_events.organisation_id
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
        where om.organisation_id = club_match_events.organisation_id
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

drop policy if exists club_match_events_public_select
    on public.club_match_events;
create policy club_match_events_public_select
on public.club_match_events
for select
to anon, authenticated
using (
    published = true
    and exists (
        select 1
        from public.club_fixtures f
        join public.organisations o
          on o.id = f.organisation_id
        where f.id = club_match_events.fixture_id
          and f.published = true
          and o.status = 'active'
          and o.public_site_enabled = true
    )
);

-- club_player_charges --------------------------------------------------------
-- Deliberately NO anon policy. Amounts, payment status and fines are private.

drop policy if exists club_player_charges_member_select
    on public.club_player_charges;
create policy club_player_charges_member_select
on public.club_player_charges
for select
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_player_charges.organisation_id
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

drop policy if exists club_player_charges_member_write
    on public.club_player_charges;
create policy club_player_charges_member_write
on public.club_player_charges
for all
to authenticated
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = club_player_charges.organisation_id
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
        where om.organisation_id = club_player_charges.organisation_id
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

commit;

-- ---------------------------------------------------------------------------
-- Verification queries (run after the migration commits)
-- ---------------------------------------------------------------------------

-- A. Every club organisation should now have at least one team.
select
    o.id as organisation_id,
    o.name as organisation_name,
    count(t.id) as team_count
from public.organisations o
left join public.teams t
  on t.organisation_id = o.id
where o.organisation_type = 'club'
group by o.id, o.name
order by o.name;

-- B. Team-season configuration and payment policy.
select
    o.name as organisation_name,
    cs.season_label,
    t.name as team_name,
    cts.status,
    cts.payment_model,
    cts.monthly_fee_amount,
    cts.matchday_sub_amount,
    cts.monthly_due_day,
    cts.yellow_card_fine_amount,
    cts.red_card_fine_amount
from public.club_team_seasons cts
join public.organisations o on o.id = cts.organisation_id
join public.club_seasons cs on cs.id = cts.season_id
join public.teams t on t.id = cts.team_id
order by o.name, cs.start_date nulls last, t.name;

-- C. Ensure existing operational data is fully team-scoped.
select
    'club_fixtures' as source,
    count(*) as total_rows,
    count(*) filter (where team_id is null) as missing_team
from public.club_fixtures
union all
select
    'club_fixture_slots',
    count(*),
    count(*) filter (where team_id is null)
from public.club_fixture_slots
union all
select
    'club_squad_members',
    count(*),
    count(*) filter (where team_id is null)
from public.club_squad_members;

-- D. New Match Centre / finance tables.
select
    to_regclass('public.club_team_seasons') as club_team_seasons,
    to_regclass('public.club_match_squads') as club_match_squads,
    to_regclass('public.club_match_squad_members') as club_match_squad_members,
    to_regclass('public.club_match_events') as club_match_events,
    to_regclass('public.club_player_charges') as club_player_charges;
