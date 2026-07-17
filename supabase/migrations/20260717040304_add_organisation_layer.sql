begin;

create extension if not exists pgcrypto;

create table if not exists public.organisations (
                                                    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
    logo_url text,
    primary_colour text,
    secondary_colour text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );

create table if not exists public.organisation_memberships (
                                                               id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null
    references public.organisations(id)
    on delete cascade,
    user_id uuid not null
    references auth.users(id)
    on delete cascade,
    role text not null
    check (
              role in (
              'super_admin',
              'competition_manager',
              'match_official'
                      )
    ),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organisation_id, user_id)
    );

alter table public.profiles
    add column if not exists deleted_at timestamptz,
    add column if not exists deleted_by uuid
    references auth.users(id)
    on delete set null;

insert into public.organisations (
    name,
    slug,
    status
)
values (
           'Black History Month Football Festival',
           'bhmff',
           'active'
       )
    on conflict (slug) do nothing;

insert into public.organisation_memberships (
    organisation_id,
    user_id,
    role,
    active
)
select
    organisation.id,
    profile.id,
    profile.role,
    profile.active
from public.profiles profile
         cross join (
    select id
    from public.organisations
    where slug = 'bhmff'
        limit 1
) organisation
    on conflict (organisation_id, user_id) do update
set
    role = excluded.role,
    active = excluded.active,
    updated_at = now();

create index if not exists
    organisation_memberships_organisation_id_idx
    on public.organisation_memberships (
    organisation_id
    );

create index if not exists
    organisation_memberships_user_id_idx
    on public.organisation_memberships (
    user_id
    );

create index if not exists
    profiles_deleted_at_idx
    on public.profiles (
    deleted_at
    );

alter table public.organisations
    enable row level security;

alter table public.organisation_memberships
    enable row level security;

create policy
    "Authenticated users can view their organisations"
on public.organisations
for select
               to authenticated
               using (
               exists (
               select 1
               from public.organisation_memberships membership
               where membership.organisation_id = organisations.id
               and membership.user_id = auth.uid()
               and membership.active = true
               )
               );

create policy
    "Members can view organisation memberships"
on public.organisation_memberships
for select
               to authenticated
               using (
               exists (
               select 1
               from public.organisation_memberships own_membership
               where own_membership.organisation_id =
               organisation_memberships.organisation_id
               and own_membership.user_id = auth.uid()
               and own_membership.active = true
               )
               );

commit;