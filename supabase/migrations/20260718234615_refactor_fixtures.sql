alter table public.fixtures
    add column if not exists competition_id uuid;

alter table public.fixtures
    add column if not exists home_competition_team_id uuid;

alter table public.fixtures
    add column if not exists away_competition_team_id uuid;

alter table public.fixtures
    add column if not exists pitch text;

alter table public.fixtures
    add column if not exists referee_name text;

alter table public.fixtures
    add column if not exists assistant_referee_1 text;

alter table public.fixtures
    add column if not exists assistant_referee_2 text;

alter table public.fixtures
    add column if not exists match_number integer;

alter table public.fixtures
    add column if not exists duration_minutes integer default 20;

alter table public.fixtures
    add column if not exists notes text;

alter table public.fixtures
    add constraint fixtures_competition_fkey
        foreign key (competition_id)
            references public.competitions(id)
            on delete cascade;

alter table public.fixtures
    add constraint fixtures_home_competition_team_fkey
        foreign key (home_competition_team_id)
            references public.competition_teams(id)
            on delete cascade;

alter table public.fixtures
    add constraint fixtures_away_competition_team_fkey
        foreign key (away_competition_team_id)
            references public.competition_teams(id)
            on delete cascade;

create index if not exists idx_fixtures_competition
    on public.fixtures(competition_id);

create index if not exists idx_fixtures_home_competition_team
    on public.fixtures(home_competition_team_id);

create index if not exists idx_fixtures_away_competition_team
    on public.fixtures(away_competition_team_id);