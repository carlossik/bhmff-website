-- Club squad portraits and registered-scorer name corrections.
-- Apply after 20260821_public_club_data_rpc.sql and 20260918_add_club_goal_type.sql.
-- Guest and opponent-own-goal names are kept as entered.
begin;

alter table public.club_players
    add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-player-photos', 'club-player-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Storage path is <organisation UUID>/<random UUID>.<extension>.
-- Only club administrators and platform administrators may upload or remove photos.
drop policy if exists club_player_photos_insert on storage.objects;
create policy club_player_photos_insert on storage.objects
for insert to authenticated
with check (
    bucket_id = 'club-player-photos'
    and exists (
        select 1 from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and o.organisation_type = 'club'
          and (
              exists (
                  select 1 from public.organisation_memberships m
                  where m.organisation_id = o.id and m.user_id = (select auth.uid())
                    and m.active and m.role in ('super_admin', 'competition_manager')
              )
              or exists (
                  select 1 from public.platform_admins pa
                  where pa.user_id = (select auth.uid()) and pa.active
              )
          )
    )
);

drop policy if exists club_player_photos_select on storage.objects;
create policy club_player_photos_select on storage.objects
for select to authenticated
using (
    bucket_id = 'club-player-photos'
    and exists (
        select 1 from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and o.organisation_type = 'club'
          and (
              exists (
                  select 1 from public.organisation_memberships m
                  where m.organisation_id = o.id and m.user_id = (select auth.uid())
                    and m.active and m.role in ('super_admin', 'competition_manager')
              )
              or exists (
                  select 1 from public.platform_admins pa
                  where pa.user_id = (select auth.uid()) and pa.active
              )
          )
    )
);

drop policy if exists club_player_photos_delete on storage.objects;
create policy club_player_photos_delete on storage.objects
for delete to authenticated
using (
    bucket_id = 'club-player-photos'
    and exists (
        select 1 from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and o.organisation_type = 'club'
          and (
              exists (
                  select 1 from public.organisation_memberships m
                  where m.organisation_id = o.id and m.user_id = (select auth.uid())
                    and m.active and m.role in ('super_admin', 'competition_manager')
              )
              or exists (
                  select 1 from public.platform_admins pa
                  where pa.user_id = (select auth.uid()) and pa.active
              )
          )
    )
);

-- Repair existing player goals with a valid squad-member link. Unlinked goals
-- need an explicit scorer selection in the admin UI; names are never guessed.
update public.club_goals g
set player_name = trim(concat_ws(' ', p.first_name, p.last_name))
from public.club_squad_members sm
join public.club_players p
  on p.id = sm.player_id and p.organisation_id = sm.organisation_id
where g.squad_member_id = sm.id
  and g.organisation_id = sm.organisation_id
  and g.season_id = sm.season_id
  and g.goal_type = 'player'
  and g.player_name is distinct from trim(concat_ws(' ', p.first_name, p.last_name));

create or replace function public.club_goal_sync_player_name()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if (new.first_name, new.last_name) is distinct from (old.first_name, old.last_name) then
        update public.club_goals g
        set player_name = trim(concat_ws(' ', new.first_name, new.last_name))
        from public.club_squad_members sm
        where sm.player_id = new.id
          and sm.organisation_id = new.organisation_id
          and g.squad_member_id = sm.id
          and g.organisation_id = sm.organisation_id
          and g.season_id = sm.season_id
          and g.goal_type = 'player'
          and g.player_name is distinct from trim(concat_ws(' ', new.first_name, new.last_name));
    end if;
    return new;
end;
$$;

drop trigger if exists club_goal_sync_player_name_on_update on public.club_players;
create trigger club_goal_sync_player_name_on_update
after update of first_name, last_name on public.club_players
for each row execute function public.club_goal_sync_player_name();

-- Keep the existing anonymous read boundary and expose only the public portrait
-- and the current name of the scorer linked to a registered squad member.
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
                        'playerName', trim(concat_ws(' ', p.first_name, p.last_name)),
                        'photoUrl', p.photo_url
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
                            when g.goal_type = 'player' then coalesce(
                                nullif(trim(concat_ws(' ', goal_player.first_name, goal_player.last_name)), ''),
                                g.player_name
                            )
                            else g.player_name
                        end,
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

comment on function public.get_public_club_data(uuid) is
'Public club season, fixture, result, squad portraits and current registered-scorer names; visible only when the club public site is enabled.';

revoke all on function public.get_public_club_data(uuid) from public;
grant execute on function public.get_public_club_data(uuid) to anon, authenticated;

commit;
