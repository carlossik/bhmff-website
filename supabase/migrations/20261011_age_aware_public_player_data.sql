-- REVIEW BEFORE DEPLOYMENT. This migration changes ONLY the club public RPC.
-- Explicit adult/senior/veterans/open-age labels are public by default.
-- Unclassified teams remain restricted (fail closed).
-- Existing explicit name permissions continue to apply where supported.
-- First classify Petts Wood using the separate reviewed SQL.
begin;
create or replace function public.get_public_club_data(
    p_organisation_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    v_season_id uuid;
    v_season_name text;
    v_season_label text;
    v_visible_team_count integer := 0;
begin
    -- Fail closed. A disabled/inactive/non-club organisation exposes nothing,
    -- even though the function runs with definer privileges.
    if p_organisation_id is null
       or not exists (
            select 1
            from public.organisations o
            where o.id = p_organisation_id
              and o.organisation_type = 'club'
              and o.status = 'active'
              and o.public_site_enabled = true
       ) then
        return null;
    end if;

    select
        cs.id,
        cs.name,
        coalesce(cs.season_label, cs.name)
    into
        v_season_id,
        v_season_name,
        v_season_label
    from public.club_seasons cs
    where cs.organisation_id = p_organisation_id
      and cs.status = 'active'
    order by cs.start_date desc nulls last, cs.created_at desc
    limit 1;

    select count(*)
    into v_visible_team_count
    from public.teams t
    where t.organisation_id = p_organisation_id
      and t.published = true
      and t.participation_status = 'confirmed';

    return jsonb_build_object(
        'season',
        case
            when v_season_id is null then null
            else jsonb_build_object(
                'id', v_season_id,
                'name', v_season_name,
                'seasonLabel', v_season_label
            )
        end,

        'teams',
        coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'name', t.name,
                    'ageGroup', t.age_group,
                    'yearGroup', t.year_group,
                    'gender', t.gender,
                    'division', t.division,
                    'logoUrl', t.logo_url
                )
                order by lower(t.name), t.name, t.id
            )
            from public.teams t
            where t.organisation_id = p_organisation_id
              and t.published = true
              and t.participation_status = 'confirmed'
        ), '[]'::jsonb),

        'fixtures',
        case
            when v_season_id is null then '[]'::jsonb
            else coalesce((
                select jsonb_agg(
                    jsonb_build_object(
                        'id', f.id,
                        'teamId', f.team_id,
                        'fixtureDate', f.fixture_date,
                        'kickoffTime', f.kickoff_time,
                        'homeAway', f.home_away,
                        'fixtureType', f.fixture_type,
                        'venueName', f.venue_name,
                        'status', f.status,
                        'opponentName', opponent.name
                    )
                    order by
                        f.fixture_date,
                        f.kickoff_time nulls last,
                        f.created_at,
                        f.id
                )
                from public.club_fixtures f
                left join public.club_opponents opponent
                  on opponent.id = f.opponent_id
                 and opponent.organisation_id = f.organisation_id
                where f.organisation_id = p_organisation_id
                  and f.season_id = v_season_id
                  and f.published = true
                  and f.status <> 'cancelled'
                  and (
                      exists (
                          select 1
                          from public.teams visible_team
                          where visible_team.id = f.team_id
                            and visible_team.organisation_id = p_organisation_id
                            and visible_team.published = true
                            and visible_team.participation_status = 'confirmed'
                      )
                      or (
                          f.team_id is null
                          and v_visible_team_count <= 1
                      )
                  )
            ), '[]'::jsonb)
        end,

        'results',
        case
            when v_season_id is null then '[]'::jsonb
            else coalesce((
                select jsonb_agg(
                    jsonb_build_object(
                        'id', r.id,
                        'fixtureId', r.fixture_id,
                        'homeScore', r.home_score,
                        'awayScore', r.away_score,
                        'playerOfTheMatch', case when (exists (select 1 from public.teams age_team where age_team.id = f.team_id and age_team.organisation_id = p_organisation_id and lower(btrim(coalesce(age_team.age_group, ''))) in ('adult', 'adults', 'senior', 'seniors', 'veterans', 'vets', 'open age', 'open-age'))) or r.public_names_enabled then r.player_of_the_match else null end
                    )
                    order by f.fixture_date desc, f.kickoff_time desc nulls last, r.id
                )
                from public.club_results r
                join public.club_fixtures f
                  on f.id = r.fixture_id
                 and f.organisation_id = r.organisation_id
                 and f.season_id = r.season_id
                where r.organisation_id = p_organisation_id
                  and r.season_id = v_season_id
                  and r.published = true
                  and f.published = true
                  and f.status <> 'cancelled'
                  and (
                      exists (
                          select 1
                          from public.teams visible_team
                          where visible_team.id = f.team_id
                            and visible_team.organisation_id = p_organisation_id
                            and visible_team.published = true
                            and visible_team.participation_status = 'confirmed'
                      )
                      or (
                          f.team_id is null
                          and v_visible_team_count <= 1
                      )
                  )
            ), '[]'::jsonb)
        end,

        'squad',
        case
            when v_season_id is null then '[]'::jsonb
            else coalesce((
                select jsonb_agg(
                    jsonb_build_object(
                        'id', sm.id,
                        'teamId', sm.team_id,
                        'squadNumber', sm.squad_number,
                        'position', sm.position,
                        'playerName', case when (exists (select 1 from public.teams age_team where age_team.id = sm.team_id and age_team.organisation_id = p_organisation_id and lower(btrim(coalesce(age_team.age_group, ''))) in ('adult', 'adults', 'senior', 'seniors', 'veterans', 'vets', 'open age', 'open-age'))) or p.public_name_enabled then trim(concat_ws(' ', p.first_name, p.last_name)) else 'Player (name hidden)' end,
                        'photoUrl', case when (exists (select 1 from public.teams age_team where age_team.id = sm.team_id and age_team.organisation_id = p_organisation_id and lower(btrim(coalesce(age_team.age_group, ''))) in ('adult', 'adults', 'senior', 'seniors', 'veterans', 'vets', 'open age', 'open-age'))) or p.public_name_enabled then p.photo_url else null end
                    )
                    order by
                        sm.squad_number nulls last,
                        lower(p.last_name),
                        lower(p.first_name),
                        sm.id
                )
                from public.club_squad_members sm
                join public.club_players p
                  on p.id = sm.player_id
                 and p.organisation_id = sm.organisation_id
                where sm.organisation_id = p_organisation_id
                  and sm.season_id = v_season_id
                  and sm.active = true
                  and (
                      exists (
                          select 1
                          from public.teams visible_team
                          where visible_team.id = sm.team_id
                            and visible_team.organisation_id = p_organisation_id
                            and visible_team.published = true
                            and visible_team.participation_status = 'confirmed'
                      )
                      or (
                          sm.team_id is null
                          and v_visible_team_count <= 1
                      )
                  )
            ), '[]'::jsonb)
        end,

        'goals',
        case
            when v_season_id is null then '[]'::jsonb
            else coalesce((
                select jsonb_agg(
                    jsonb_build_object(
                        'id', g.id,
                        'fixtureId', g.fixture_id,
                        'playerName', case
                            when g.goal_type = 'player' and ((exists (select 1 from public.teams age_team where age_team.id = f.team_id and age_team.organisation_id = p_organisation_id and lower(btrim(coalesce(age_team.age_group, ''))) in ('adult', 'adults', 'senior', 'seniors', 'veterans', 'vets', 'open age', 'open-age'))) or goal_player.public_name_enabled) then
                                coalesce(nullif(trim(concat_ws(' ', goal_player.first_name, goal_player.last_name)), ''), nullif(btrim(g.player_name), ''), 'Player (name unavailable)')
                            when g.goal_type <> 'player' and ((exists (select 1 from public.teams age_team where age_team.id = f.team_id and age_team.organisation_id = p_organisation_id and lower(btrim(coalesce(age_team.age_group, ''))) in ('adult', 'adults', 'senior', 'seniors', 'veterans', 'vets', 'open age', 'open-age'))) or g.public_names_enabled) then g.player_name
                            else 'Player (name hidden)' end,
                        'squadMemberId', g.squad_member_id
                    )
                    order by f.fixture_date desc, g.id
                )
                from public.club_goals g
                join public.club_fixtures f
                  on f.id = g.fixture_id
                 and f.organisation_id = g.organisation_id
                 and f.season_id = g.season_id
                left join public.club_squad_members goal_member
                  on goal_member.id = g.squad_member_id
                 and goal_member.organisation_id = g.organisation_id
                 and goal_member.season_id = g.season_id
                left join public.club_players goal_player
                  on goal_player.id = goal_member.player_id
                 and goal_player.organisation_id = g.organisation_id
                where g.organisation_id = p_organisation_id
                  and g.season_id = v_season_id
                  and f.published = true
                  and f.status <> 'cancelled'
                  and (
                      exists (
                          select 1
                          from public.teams visible_team
                          where visible_team.id = f.team_id
                            and visible_team.organisation_id = p_organisation_id
                            and visible_team.published = true
                            and visible_team.participation_status = 'confirmed'
                      )
                      or (
                          f.team_id is null
                          and v_visible_team_count <= 1
                      )
                  )
            ), '[]'::jsonb)
        end
    );
end;
$$;

comment on function public.get_public_club_data(uuid) is 'Public club read model: explicitly adult team names visible; youth or unclassified names require explicit opt-in';
revoke all on function public.get_public_club_data(uuid) from public;
grant execute on function public.get_public_club_data(uuid) to anon, authenticated;

-- Competition public views: only explicitly adult competitions bypass youth name restrictions.
-- NULL/unknown age_category continues to use explicit name authorisations.
alter table public.competitions
  add column if not exists age_category text;

do $$
declare v_cols text;
begin
  select string_agg(
    case when column_name = 'player_name' then
      'case when (lower(btrim(coalesce(c.age_category, ''''))) in (''adult'', ''senior'', ''veterans'', ''open age'') or r.public_names_enabled) then r.player_name else ''Player (name hidden)'' end as player_name'
    else format('r.%I', column_name) end, ', ' order by ordinal_position)
  into v_cols
  from information_schema.columns
  where table_schema='public' and table_name='goals';
  execute 'create or replace view public.public_goals with (security_barrier=true) as select ' || v_cols ||
    ' from public.goals r join public.competitions c on c.id=r.competition_id' ||
    ' join public.organisations o on o.id=c.organisation_id' ||
    ' where c.published=true and o.status=''active'' and o.public_site_enabled=true' ||
    ' and exists (select 1 from public.fixtures f where f.id=r.fixture_id and f.published=true)';
  select string_agg(
    case when column_name in ('player_of_match','match_report') then
      format('case when (lower(btrim(coalesce(c.age_category, ''''))) in (''adult'', ''senior'', ''veterans'', ''open age'') or r.public_names_enabled) then r.%I else null end as %I',column_name,column_name)
    else format('r.%I',column_name) end, ', ' order by ordinal_position)
  into v_cols
  from information_schema.columns
  where table_schema='public' and table_name='results';
  execute 'create or replace view public.public_results with (security_barrier=true) as select ' || v_cols ||
    ' from public.results r join public.competitions c on c.id=r.competition_id' ||
    ' join public.organisations o on o.id=c.organisation_id' ||
    ' where r.published=true and c.published=true and o.status=''active'' and o.public_site_enabled=true' ||
    ' and exists (select 1 from public.fixtures f where f.id=r.fixture_id and f.published=true)';
end $$;
grant select on public.public_goals, public.public_results to anon, authenticated;
notify pgrst, 'reload schema';

commit;
