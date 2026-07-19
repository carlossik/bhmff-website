create table public.coaches (
                                id uuid primary key default gen_random_uuid(),

                                organisation_id uuid not null
                                    references public.organisations(id)
                                        on delete cascade,

                                club_id uuid
                                    references public.clubs(id)
                                        on delete cascade,

                                team_id uuid
                                    references public.teams(id)
                                        on delete cascade,

                                first_name text not null,
                                last_name text not null,

                                email text,
                                phone text,

                                role text not null default 'Coach',

                                photo_url text,

                                qualifications text,

                                dbs_expiry date,

                                first_aid_expiry date,

                                safeguarding_expiry date,

                                active boolean not null default true,

                                created_at timestamptz not null default now(),

                                updated_at timestamptz not null default now()
);

create index idx_coaches_organisation
    on public.coaches(organisation_id);

create index idx_coaches_club
    on public.coaches(club_id);

create index idx_coaches_team
    on public.coaches(team_id);

alter table public.coaches
    enable row level security;

create policy "Coaches are viewable"
on public.coaches
for select
               using (true);

create policy "Admins manage coaches"
on public.coaches
for all
using (
    exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = coaches.organisation_id
          and om.user_id = auth.uid()
          and om.role in ('owner','admin')
    )
);