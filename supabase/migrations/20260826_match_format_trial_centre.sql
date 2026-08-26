-- TournamentHQ: fixture match format + Trial Centre

alter table public.fixtures
    add column if not exists match_format text not null default '11v11';

alter table public.club_fixtures
    add column if not exists match_format text not null default '11v11';

do $$ begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'fixtures_match_format_check'
          and conrelid = 'public.fixtures'::regclass
    ) then
        alter table public.fixtures add constraint fixtures_match_format_check
            check (match_format in ('5v5','7v7','9v9','11v11'));
    end if;
    if not exists (
        select 1 from pg_constraint
        where conname = 'club_fixtures_match_format_check'
          and conrelid = 'public.club_fixtures'::regclass
    ) then
        alter table public.club_fixtures add constraint club_fixtures_match_format_check
            check (match_format in ('5v5','7v7','9v9','11v11'));
    end if;
end $$;


-- Ensure trialists can exist in the team squad without triggering normal registration/payment behaviour.
alter table public.club_squad_members
    drop constraint if exists club_squad_members_registration_status_check;

alter table public.club_squad_members
    add constraint club_squad_members_registration_status_check
    check (registration_status in ('pending','registered','trialist','not_registered','inactive'));

create table if not exists public.club_trialists (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    season_id uuid references public.club_seasons(id) on delete set null,
    team_id uuid,
    first_name text not null,
    last_name text not null,
    date_of_birth date,
    position text,
    preferred_foot text,
    email text,
    phone text,
    guardian_name text,
    guardian_email text,
    guardian_phone text,
    previous_club text,
    referred_by text,
    trial_date timestamptz,
    trial_type text not null default 'training' check (trial_type in ('training','match','other')),
    venue_name text,
    venue_address text,
    status text not null default 'draft' check (status in ('draft','invited','accepted','declined','scheduled','attended','under_review','offered','further_trial','unsuccessful','no_show','withdrawn')),
    eligible_for_match_trial boolean not null default false,
    internal_notes text,
    report_summary text,
    decision text check (decision is null or decision in ('offer_place','further_trial','keep_observing','unsuccessful')),
    linked_player_id uuid references public.club_players(id) on delete set null,
    linked_squad_member_id uuid references public.club_squad_members(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_trialists_team_season_fkey foreign key (organisation_id, season_id, team_id)
      references public.club_team_seasons(organisation_id, season_id, team_id) on delete restrict
);

create table if not exists public.club_trial_assessments (
    id uuid primary key default gen_random_uuid(),
    trialist_id uuid not null unique references public.club_trialists(id) on delete cascade,
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    technical integer not null default 3 check (technical between 1 and 5),
    tactical integer not null default 3 check (tactical between 1 and 5),
    physical integer not null default 3 check (physical between 1 and 5),
    attitude integer not null default 3 check (attitude between 1 and 5),
    coachability integer not null default 3 check (coachability between 1 and 5),
    teamwork integer not null default 3 check (teamwork between 1 and 5),
    strengths text,
    development_areas text,
    coach_notes text,
    public_feedback text,
    recommendation text not null check (recommendation in ('offer_place','further_trial','keep_observing','unsuccessful')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.club_trial_invitations (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    trialist_id uuid not null references public.club_trialists(id) on delete cascade,
    token_hash text not null unique,
    recipient_email text not null,
    delivery_status text not null default 'queued',
    provider_message_id text,
    response text check (response is null or response in ('accepted','declined')),
    responded_by_name text,
    response_note text,
    sent_at timestamptz,
    responded_at timestamptz,
    expires_at timestamptz not null default (now() + interval '30 days'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_club_trialists_org_status on public.club_trialists(organisation_id,status);
create index if not exists idx_club_trialists_team on public.club_trialists(organisation_id,season_id,team_id);
create index if not exists idx_club_trial_invitations_trialist on public.club_trial_invitations(trialist_id,created_at desc);

alter table public.club_trialists enable row level security;
alter table public.club_trial_assessments enable row level security;
alter table public.club_trial_invitations enable row level security;

-- Admin UI access follows the existing organisation membership model.
drop policy if exists "Organisation members manage trialists" on public.club_trialists;
create policy "Organisation members manage trialists" on public.club_trialists
for all to authenticated
using (exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = club_trialists.organisation_id
      and m.user_id = auth.uid()
      and m.active = true
))
with check (exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = club_trialists.organisation_id
      and m.user_id = auth.uid()
      and m.active = true
));

drop policy if exists "Organisation members manage trial assessments" on public.club_trial_assessments;
create policy "Organisation members manage trial assessments" on public.club_trial_assessments
for all to authenticated
using (exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = club_trial_assessments.organisation_id
      and m.user_id = auth.uid()
      and m.active = true
))
with check (exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = club_trial_assessments.organisation_id
      and m.user_id = auth.uid()
      and m.active = true
));

-- Invitations are intentionally private; public response goes through the Edge Function service role.
drop policy if exists "Organisation members view trial invitations" on public.club_trial_invitations;
create policy "Organisation members view trial invitations" on public.club_trial_invitations
for select to authenticated
using (exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = club_trial_invitations.organisation_id
      and m.user_id = auth.uid()
      and m.active = true
));
