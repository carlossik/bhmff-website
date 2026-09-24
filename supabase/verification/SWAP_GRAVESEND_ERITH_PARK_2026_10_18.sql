-- Optional one-off action AFTER deployment, run only after verifying the preview.
-- The named competition ID is the Black History Month Football Tournament.
-- Never add this script to the automatic migration sequence.
begin;
do $$
declare
  v_fixture public.fixtures%rowtype;
  v_count integer;
  v_home uuid;
  v_away uuid;
begin
  select count(*), (array_agg(f.id))[1],
    (array_agg(f.home_competition_team_id))[1], (array_agg(f.away_competition_team_id))[1]
    into v_count, v_fixture.id, v_home, v_away
  from public.fixtures f
  join public.competition_teams h on h.id = f.home_competition_team_id
  join public.teams ht on ht.id = h.team_id
  join public.competition_teams a on a.id = f.away_competition_team_id
  join public.teams at_ on at_.id = a.team_id
  where f.competition_id = '6b1a086e-f342-45d5-8f51-1c85141d26ae'
    and (f.kickoff_time at time zone 'Europe/London')::date = date '2026-10-18'
    and lower(ht.name) = 'erith park' and lower(at_.name) = 'gravesend';
  if v_count <> 1 then
    raise exception 'Expected exactly one Erith Park home vs Gravesend away fixture on 18 October; found %', v_count;
  end if;
  select * into v_fixture from public.fixtures where id = v_fixture.id for update;
  if v_fixture.home_competition_team_id is distinct from v_home
    or v_fixture.away_competition_team_id is distinct from v_away
    or (v_fixture.kickoff_time at time zone 'Europe/London')::date <> date '2026-10-18' then
    raise exception 'Fixture changed since selection; no swap performed';
  end if;
  if v_fixture.status = 'completed'
    or exists (select 1 from public.results where fixture_id = v_fixture.id)
    or exists (select 1 from public.goals where fixture_id = v_fixture.id) then
    raise exception 'Fixture already has a result, goals or completed status';
  end if;
  update public.fixtures
  set home_competition_team_id = v_fixture.away_competition_team_id,
      away_competition_team_id = v_fixture.home_competition_team_id
  where id = v_fixture.id;
  raise notice 'Swapped home/away for fixture %; verify venue and kickoff before commit', v_fixture.id;
end $$;
-- Replace COMMIT with ROLLBACK for a rehearsal.
commit;
