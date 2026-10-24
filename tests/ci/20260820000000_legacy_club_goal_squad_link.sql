-- CI-ONLY historical schema gap: original 20260812 club_goals table omits the
-- registered-scorer squad link, but the deployed public schema contains it.
-- Source of shape: read-only TournamentHQ schema metadata (2026-10-21):
--   club_goals.squad_member_id uuid NULL
--   FK to club_squad_members(id) ON DELETE SET NULL
--   index idx_club_goals_squad_member_id
-- This file is copied to supabase/migrations by GitHub Actions on staging only.
-- It is not a hosted production migration and must never be deployed remotely.

begin;

alter table public.club_goals
    add column if not exists squad_member_id uuid;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.club_goals'::regclass
          and conname = 'club_goals_squad_member_id_fkey'
    ) then
        alter table public.club_goals
            add constraint club_goals_squad_member_id_fkey
            foreign key (squad_member_id)
            references public.club_squad_members(id)
            on delete set null;
    end if;
end
$$;

create index if not exists idx_club_goals_squad_member_id
    on public.club_goals (squad_member_id);

commit;
