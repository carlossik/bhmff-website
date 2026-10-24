-- GitHub Actions staging-only repair of a missing legacy match competition link.
-- The production schema introspected on 2026-10-21 defines:
--   public.results.competition_id uuid NOT NULL
--   public.goals.competition_id   uuid NOT NULL
-- Both link to public.competitions(id) ON DELETE CASCADE, with matching indexes.
-- The 20260924 access-control migration references these fields in policies.
-- This file is copied to the disposable CI database only; NEVER deploy to production.

begin;

alter table public.results add column if not exists competition_id uuid;
alter table public.goals add column if not exists competition_id uuid;

-- Backfill any existing CI fixtures safely before enforcing NOT NULL.
-- A record without a competition cannot satisfy the deployed schema and
-- intentionally causes the subsequent NOT NULL validation to fail closed.
update public.results r
set competition_id = f.competition_id
from public.fixtures f
where r.fixture_id = f.id and r.competition_id is null;

update public.goals g
set competition_id = f.competition_id
from public.fixtures f
where g.fixture_id = f.id and g.competition_id is null;

alter table public.results alter column competition_id set not null;
alter table public.goals alter column competition_id set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.results'::regclass
          and conname = 'results_competition_id_fkey'
    ) then
        alter table public.results
            add constraint results_competition_id_fkey
            foreign key (competition_id)
            references public.competitions(id) on delete cascade;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.goals'::regclass
          and conname = 'goals_competition_id_fkey'
    ) then
        alter table public.goals
            add constraint goals_competition_id_fkey
            foreign key (competition_id)
            references public.competitions(id) on delete cascade;
    end if;
end
$$;

create index if not exists results_competition_id_idx
    on public.results (competition_id);
create index if not exists goals_competition_id_idx
    on public.goals (competition_id);

commit;
