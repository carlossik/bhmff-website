create table public.match_officials (
                                        id uuid primary key default gen_random_uuid(),

                                        organisation_id uuid not null
                                            references public.organisations(id)
                                                on delete cascade,

                                        competition_id uuid not null
                                            references public.competitions(id)
                                                on delete cascade,

                                        fixture_id uuid
                                            references public.fixtures(id)
                                                on delete cascade,

                                        first_name text not null,

                                        last_name text not null,

                                        email text,

                                        phone text,

                                        role text not null default 'Referee',

                                        qualification_level text,

                                        active boolean not null default true,

                                        created_at timestamptz not null default now(),

                                        updated_at timestamptz not null default now()
);

create index idx_match_officials_org
    on public.match_officials(organisation_id);

create index idx_match_officials_competition
    on public.match_officials(competition_id);

create index idx_match_officials_fixture
    on public.match_officials(fixture_id);

alter table public.match_officials
    enable row level security;

create policy "Match officials are viewable"
on public.match_officials
for select
               using (true);

create policy "Admins manage match officials"
on public.match_officials
for all
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = match_officials.organisation_id
          and om.user_id = auth.uid()
          and om.role in ('owner','admin')
    )
);