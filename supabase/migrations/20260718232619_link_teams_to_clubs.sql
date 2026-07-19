alter table public.teams
    add column club_id uuid;

alter table public.teams
    add constraint teams_club_id_fkey
        foreign key (club_id)
            references public.clubs(id)
            on delete restrict;

create index idx_teams_club_id
    on public.teams(club_id);