alter table public.players
    add column if not exists organisation_id uuid;

alter table public.players
    add column if not exists first_name text;

alter table public.players
    add column if not exists last_name text;

alter table public.players
    add column if not exists preferred_name text;

alter table public.players
    add column if not exists date_of_birth date;

alter table public.players
    add column if not exists gender text;

alter table public.players
    add column if not exists registration_number text;

alter table public.players
    add column if not exists photo_url text;

alter table public.players
    add column if not exists medical_notes text;

alter table public.players
    add column if not exists emergency_contact_name text;

alter table public.players
    add column if not exists emergency_contact_phone text;

alter table public.players
    add column if not exists emergency_contact_relationship text;

alter table public.players
    add column if not exists active boolean not null default true;

alter table public.players
    add column if not exists updated_at timestamptz not null default now();

alter table public.players
    add constraint players_organisation_fkey
        foreign key (organisation_id)
            references public.organisations(id)
            on delete cascade;

create index if not exists idx_players_team
    on public.players(team_id);

create index if not exists idx_players_organisation
    on public.players(organisation_id);

alter table public.players
    enable row level security;

drop policy if exists "Players are viewable"
on public.players;

create policy "Players are viewable"
on public.players
for select
                    using (true);

drop policy if exists "Admins manage players"
on public.players;

create policy "Admins manage players"
on public.players
for all
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = players.organisation_id
          and om.user_id = auth.uid()
          and om.role in ('owner','admin')
    )
);