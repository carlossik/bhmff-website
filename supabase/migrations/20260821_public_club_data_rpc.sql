-- TournamentHQ Enterprise
-- Public Club Data: session-independent public read boundary
-- Date: 2026-08-21
--
-- Problem fixed:
-- The club public site previously read club_seasons / club_squad_members /
-- club_results / club_goals directly from the browser. Those tables are
-- protected by member-only RLS policies, so anonymous visitors received zero
-- rows while logged-in club members could see the same data. The result was a
-- public website whose Next Match/countdown and other club data depended on the
-- visitor's Supabase authentication session.
--
-- Architecture:
-- This SECURITY DEFINER RPC is the public read boundary for club operational
-- data. It returns ONLY fields intentionally displayed on the public website.
-- It never returns contact details, payment data, fines, private notes, emails,
-- phone numbers or other admin-only fields.
--
-- The function returns data only when the organisation itself is active, is a
-- club, and has public_site_enabled=true. It is executable by both anon and
-- authenticated visitors, so the same public URL behaves identically for both.

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
                        'playerOfTheMatch', r.player_of_the_match
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
                        'playerName', trim(concat_ws(' ', p.first_name, p.last_name))
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
                        'playerName', g.player_name,
                        'squadMemberId', g.squad_member_id
                    )
                    order by f.fixture_date desc, g.id
                )
                from public.club_goals g
                join public.club_fixtures f
                  on f.id = g.fixture_id
                 and f.organisation_id = g.organisation_id
                 and f.season_id = g.season_id
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

comment on function public.get_public_club_data(uuid) is
'Public, session-independent read model for TournamentHQ club websites. Returns only explicitly public club season/team/fixture/result/squad/goal fields and only while the organisation public site is enabled.';

-- Do not leave implicit PUBLIC execute privileges on a SECURITY DEFINER function.
revoke all on function public.get_public_club_data(uuid) from public;
grant execute on function public.get_public_club_data(uuid) to anon, authenticated;

-- The RPC above is now the ONLY public read boundary for club fixture rows.
-- The legacy policy exposed every column on a published club_fixtures row to
-- anonymous clients, including opponent contact details and private notes.
-- RLS filters rows, not columns, so keeping that policy would defeat the
-- field-level safety provided by the RPC.
drop policy if exists club_fixtures_public_select
    on public.club_fixtures;

commit;
