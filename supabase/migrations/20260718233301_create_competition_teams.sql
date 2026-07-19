create table public.competition_teams (
                                          id uuid primary key default gen_random_uuid(),

                                          competition_id uuid not null
                                              references public.competitions(id)
                                                  on delete cascade,

                                          team_id uuid not null
                                              references public.teams(id)
                                                  on delete cascade,

                                          group_id uuid
                                                              references public.groups(id)
                                                                  on delete set null,

                                          seed integer,

                                          status text not null default 'registered',

                                          created_at timestamptz not null default now()
);

create unique index idx_competition_team
    on public.competition_teams(competition_id, team_id);

create index idx_competition_team_group
    on public.competition_teams(group_id);

alter table public.competition_teams
    enable row level security;

create policy "Competition teams are visible"
on public.competition_teams
for select
               using (true);

create policy "Admins manage competition teams"
on public.competition_teams
for all
using (
    exists (
        select 1
        from public.organisation_memberships om
        join public.competitions c
            on c.organisation_id = om.organisation_id
        where c.id = competition_teams.competition_id
        and om.user_id = auth.uid()
        and om.role in ('owner','admin')
    )
);