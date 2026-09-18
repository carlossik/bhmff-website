-- TournamentHQ club goal attribution model.
-- Adds an explicit goal_type so registered-player goals, guest-player goals
-- and opponent own goals are distinguishable without inferring from names.

begin;

alter table public.club_goals
    add column if not exists goal_type text;

-- Backfill current data safely:
--  * a linked squad member is a registered player goal;
--  * the label introduced by the own-goal UI is an opponent own goal;
--  * any other historic unlinked scorer is retained as a guest scorer.
update public.club_goals
set goal_type = case
    when squad_member_id is not null then 'player'
    when lower(trim(player_name)) = 'own goal (opponent)' then 'own_goal'
    else 'guest'
end
where goal_type is null
   or goal_type not in ('player', 'guest', 'own_goal');

alter table public.club_goals
    alter column goal_type set default 'player';

alter table public.club_goals
    alter column goal_type set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.club_goals'::regclass
          and conname = 'club_goals_goal_type_check'
    ) then
        alter table public.club_goals
            add constraint club_goals_goal_type_check
            check (goal_type in ('player', 'guest', 'own_goal'));
    end if;
end
$$;

commit;
