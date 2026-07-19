create table public.clubs (
                              id uuid primary key default gen_random_uuid(),

                              organisation_id uuid not null
                                  references public.organisations(id)
                                      on delete cascade,

                              name text not null,

                              short_name text,

                              badge_url text,

                              website text,

                              email text,

                              phone text,

                              address text,

                              created_at timestamptz not null default now(),

                              updated_at timestamptz not null default now()
);

create index idx_clubs_organisation
    on public.clubs(organisation_id);

alter table public.clubs
    enable row level security;

create policy "Organisation members can view clubs"
on public.clubs
for select
               using (
               organisation_id in (
               select organisation_id
               from public.organisation_memberships
               where user_id = auth.uid()
               )
               );

create policy "Organisation admins manage clubs"
on public.clubs
for all
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = clubs.organisation_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
);