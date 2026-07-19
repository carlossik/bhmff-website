alter table public.groups
    add column if not exists competition_id uuid;

alter table public.groups
    add constraint groups_competition_fkey
        foreign key (competition_id)
            references public.competitions(id)
            on delete cascade;

create index if not exists idx_groups_competition
    on public.groups(competition_id);