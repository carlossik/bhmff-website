alter table public.teams
    add column age_group text;

alter table public.teams
    add column gender text default 'Mixed';

alter table public.teams
    add column division text;

alter table public.teams
    add column home_kit_colour text;

alter table public.teams
    add column away_kit_colour text;

alter table public.teams
    add column year_group integer;