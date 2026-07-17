-- ===========================================================
-- Create Competitions
-- TournamentHQ Phase 3
-- ===========================================================

create table if not exists public.competitions
(
    id uuid primary key default gen_random_uuid(),

    organisation_id uuid not null
    references public.organisations(id)
    on delete restrict,

    name text not null,

    slug text not null,

    season text,

    format text not null
    check (
              format in (
              'LEAGUE',
              'ROUND_ROBIN',
              'GROUP_AND_KNOCKOUT',
              'KNOCKOUT',
              'SINGLE_MATCH',
              'FRIENDLY',
              'CUSTOM'
                        )
    ),

    description text,

    start_date date,

    end_date date,

    status text not null default 'DRAFT'
    check (
              status in (
              'DRAFT',
              'ACTIVE',
              'COMPLETED',
              'ARCHIVED'
                        )
    ),

    published boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
    );

create unique index if not exists competitions_slug_org_idx
    on public.competitions
    (
    organisation_id,
    slug
    );

create index if not exists competitions_org_idx
    on public.competitions
    (
    organisation_id
    );

alter table public.competitions
    enable row level security;

create policy "Organisation members can view competitions"
on public.competitions
for select
               to authenticated
               using (
               public.is_active_organisation_member(
               organisation_id
               )
               );

create policy "Organisation members can create competitions"
on public.competitions
for insert
to authenticated
with check (
    public.is_active_organisation_member(
        organisation_id
    )
);

create policy "Organisation members can update competitions"
on public.competitions
for update
                      to authenticated
                      using (
                      public.is_active_organisation_member(
                      organisation_id
                      )
                      )
    with check (
                      public.is_active_organisation_member(
                      organisation_id
                      )
                      );

create policy "Organisation members can delete competitions"
on public.competitions
for delete
to authenticated
using (
    public.is_active_organisation_member(
        organisation_id
    )
);