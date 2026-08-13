-- TournamentHQ
-- Club Squad foundation
-- Adds persistent club players plus season-specific squad membership and fee tracking.
-- Safe: does not alter competition teams or competition goals.

create table if not exists public.club_players (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    first_name text not null,
    last_name text not null,
    email text null,
    phone text null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_club_players_organisation_id
    on public.club_players (organisation_id);

create index if not exists idx_club_players_name
    on public.club_players (organisation_id, lower(last_name), lower(first_name));

create table if not exists public.club_squad_members (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    season_id uuid not null references public.club_seasons(id) on delete cascade,
    player_id uuid not null references public.club_players(id) on delete cascade,
    squad_number integer null check (squad_number is null or squad_number between 0 and 999),
    position text null,
    registration_status text not null default 'pending'
        check (registration_status in ('pending', 'registered', 'not_registered', 'inactive')),
    sign_on_fee_amount numeric(10,2) not null default 0 check (sign_on_fee_amount >= 0),
    sign_on_fee_status text not null default 'not_due'
        check (sign_on_fee_status in ('not_due', 'due', 'part_paid', 'paid', 'waived')),
    subs_amount numeric(10,2) not null default 0 check (subs_amount >= 0),
    subs_status text not null default 'not_due'
        check (subs_status in ('not_due', 'due', 'part_paid', 'paid', 'waived')),
    notes text null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (season_id, player_id)
);

create index if not exists idx_club_squad_members_season_id
    on public.club_squad_members (season_id);

create index if not exists idx_club_squad_members_organisation_id
    on public.club_squad_members (organisation_id);

create index if not exists idx_club_squad_members_player_id
    on public.club_squad_members (player_id);

alter table public.club_players enable row level security;
alter table public.club_squad_members enable row level security;

drop policy if exists "club_players_member_select" on public.club_players;
create policy "club_players_member_select"
on public.club_players
for select
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_players.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists "club_players_member_write" on public.club_players;
create policy "club_players_member_write"
on public.club_players
for all
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_players.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
)
with check (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_players.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists "club_squad_members_member_select" on public.club_squad_members;
create policy "club_squad_members_member_select"
on public.club_squad_members
for select
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_squad_members.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);

drop policy if exists "club_squad_members_member_write" on public.club_squad_members;
create policy "club_squad_members_member_write"
on public.club_squad_members
for all
to authenticated
using (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_squad_members.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
)
with check (
    exists (
        select 1 from public.organisation_memberships om
        where om.organisation_id = club_squad_members.organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role in ('competition_manager', 'super_admin')
    )
    or exists (
        select 1 from public.platform_admins pa
        where pa.user_id = auth.uid() and pa.active = true
    )
);
