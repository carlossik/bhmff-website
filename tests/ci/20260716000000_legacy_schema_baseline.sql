-- TournamentHQ: candidate pre-organisation legacy schema baseline.
-- LOCAL CI VALIDATION ONLY until a complete `supabase db reset` succeeds.
-- Reconstructed from October 2026 catalog metadata and July migration dependencies.
-- This is NOT a production migration. Never apply to the hosted project.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto;

-- Supabase Auth owns auth.users; local Supabase creates it automatically.
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    role text not null default 'match_official',
    active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    email text
);

create table public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    manager_name text,
    contact_email text,
    contact_phone text,
    logo_url text,
    notes text,
    created_at timestamptz default now(),
    published boolean not null default false,
    participation_status text,
    primary_home_venue_id uuid
);

create table public.venues (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text,
    postcode text,
    notes text,
    created_at timestamptz default now()
);

-- The festivals table is no longer in the live production catalogue;
-- only the fields referenced by the first migration are reconstructable.
create table public.festivals (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    year integer,
    status text default 'draft',
    created_at timestamptz default now()
);

create table public.groups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    sort_order integer not null default 1,
    created_at timestamptz default now(),
    published boolean not null default false
);

create table public.players (
    id uuid primary key default gen_random_uuid(),
    team_id uuid references public.teams(id) on delete set null,
    full_name text not null,
    shirt_number integer,
    position text,
    created_at timestamptz default now()
);

create table public.fixtures (
    id uuid primary key default gen_random_uuid(),
    venue_id uuid references public.venues(id) on delete set null,
    stage text not null,
    kickoff_time timestamptz,
    status text default 'scheduled',
    created_at timestamptz default now(),
    group_id uuid references public.groups(id) on delete set null,
    published boolean not null default false
);

create table public.results (
    id uuid primary key default gen_random_uuid(),
    fixture_id uuid references public.fixtures(id) on delete cascade,
    home_score integer default 0,
    away_score integer default 0,
    player_of_match text,
    match_report text,
    published boolean default false,
    created_at timestamptz default now()
);

create table public.goals (
    id uuid primary key default gen_random_uuid(),
    fixture_id uuid references public.fixtures(id) on delete cascade,
    team_id uuid references public.teams(id) on delete set null,
    player_name text,
    minute integer,
    video_timestamp text,
    created_at timestamptz default now()
);

-- Pre-organisation content tables: later migrations add organisation ownership.
create table public.articles (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text not null,
    category text not null,
    summary text,
    body text,
    image_url text,
    published boolean default false,
    created_at timestamptz default now(),
    status text not null default 'draft',
    hero text,
    read_time text,
    author text,
    published_at timestamptz,
    featured boolean,
    image_alt text,
    tags text[],
    actions jsonb,
    updated_at timestamptz
);

create table public.media (
    id uuid primary key default gen_random_uuid(),
    title text,
    slug text,
    category text,
    status text default 'draft',
    description text,
    youtube_url text,
    embed_url text,
    thumbnail_url text,
    thumbnail_alt text,
    featured boolean,
    fixture_id uuid references public.fixtures(id) on delete set null,
    published_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz
);

-- Legacy commercial enquiry tables, required by 20260802_add_enquiry_organisation_id.sql.
-- organisation_id is intentionally omitted: that migration adds it.
-- sponsor_enquiries.competition_id must exist before its backfill executes.
create table public.sponsor_enquiries (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    company_name text not null,
    contact_name text not null,
    email text not null,
    phone text,
    sponsorship_interest text,
    estimated_budget text,
    message text not null,
    status text default 'new',
    internal_notes text,
    competition_id uuid
);

create table public.demo_requests (
    id uuid primary key default gen_random_uuid(),
    organisation text not null,
    contact_name text not null,
    email text not null,
    phone text,
    competition_type text not null,
    number_of_teams integer,
    message text not null,
    status text not null default 'new',
    internal_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
