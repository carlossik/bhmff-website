-- CI-only reconstruction of missing officials catalogue objects.
-- Deliberately placed after competitions are created and before 20260808 function.

-- Officials catalogue. CI-only reconstruction from October 2026 schema metadata.
-- The existing public fixture officials function (20260808) depends on these tables.
create table public.officials (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    sport_id uuid,
    first_name text not null,
    last_name text not null,
    full_name text,
    email text,
    phone text,
    role text,
    status text not null default 'pending',
    verification_status text default 'not_verified',
    marketplace_visibility text default 'private',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.official_assignments (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    official_id uuid not null references public.officials(id) on delete cascade,
    competition_id uuid references public.competitions(id) on delete set null,
    fixture_id uuid references public.fixtures(id) on delete set null,
    venue_id uuid references public.venues(id) on delete set null,
    sport_id uuid,
    role text not null,
    source text default 'manual',
    status text not null default 'draft',
    assigned_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
