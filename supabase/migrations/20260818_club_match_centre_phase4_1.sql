-- TournamentHQ Enterprise
-- Club Match Centre Phase 4.1
-- Atomic matchday-squad save/confirm workflow.
--
-- Prerequisite:
--   20260814_phase2_multiteam_club_payments_match_centre.sql
--
-- This migration does not create a second Match Centre data model. It uses the
-- existing club_match_squads and club_match_squad_members tables and adds one
-- guarded RPC so a complete squad selection is written atomically.

begin;

create or replace function public.club_match_centre_save_squad(
    p_organisation_id uuid,
    p_fixture_id uuid,
    p_status text,
    p_published boolean default false,
    p_notes text default null,
    p_members jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    v_fixture public.club_fixtures%rowtype;
    v_existing_status text;
    v_match_squad_id uuid;
    v_members jsonb := coalesce(p_members, '[]'::jsonb);
    v_member_count integer := 0;
    v_valid_member_count integer := 0;
    v_captain_count integer := 0;
    v_effective_published boolean := false;
begin
    if p_organisation_id is null then
        raise exception 'Organisation is required.' using errcode = '22023';
    end if;

    if p_fixture_id is null then
        raise exception 'Fixture is required.' using errcode = '22023';
    end if;

    if p_status not in ('draft', 'confirmed') then
        raise exception 'Matchday squad status must be draft or confirmed.'
            using errcode = '22023';
    end if;

    if jsonb_typeof(v_members) <> 'array' then
        raise exception 'Matchday squad members must be supplied as an array.'
            using errcode = '22023';
    end if;

    select *
    into v_fixture
    from public.club_fixtures f
    where f.id = p_fixture_id;

    if not found then
        raise exception 'The selected club fixture does not exist.'
            using errcode = 'P0002';
    end if;

    if v_fixture.organisation_id <> p_organisation_id then
        raise exception 'The selected fixture does not belong to this organisation.'
            using errcode = '42501';
    end if;

    if not (
        exists (
            select 1
            from public.organisation_memberships om
            where om.organisation_id = p_organisation_id
              and om.user_id = auth.uid()
              and om.active = true
              and om.role in ('competition_manager', 'super_admin')
        )
        or exists (
            select 1
            from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.active = true
        )
    ) then
        raise exception 'You do not have permission to manage this matchday squad.'
            using errcode = '42501';
    end if;

    if p_status = 'confirmed'
       and v_fixture.status in ('cancelled', 'postponed', 'abandoned') then
        raise exception 'A matchday squad cannot be confirmed for a % fixture.',
            v_fixture.status
            using errcode = '22023';
    end if;

    select ms.status
    into v_existing_status
    from public.club_match_squads ms
    where ms.fixture_id = p_fixture_id;

    if v_existing_status = 'completed' then
        raise exception 'This matchday squad is completed and cannot be rewritten.'
            using errcode = '55000';
    end if;

    -- Once match activity has started, changing squad membership here could
    -- detach football events or corrupt historical appearances. Match activity
    -- must be managed by the later Match Centre workflow instead.
    if exists (
        select 1
        from public.club_match_squads ms
        join public.club_match_squad_members msm
          on msm.match_squad_id = ms.id
        where ms.fixture_id = p_fixture_id
          and msm.appearance_status <> 'selected'
    )
    or exists (
        select 1
        from public.club_match_events me
        where me.fixture_id = p_fixture_id
    ) then
        raise exception 'Match activity has already started. The squad can no longer be rewritten from squad setup.'
            using errcode = '55000';
    end if;

    v_member_count := jsonb_array_length(v_members);

    if p_status = 'confirmed' and v_member_count = 0 then
        raise exception 'Select at least one player before confirming the squad.'
            using errcode = '22023';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(v_members) as item(value)
        where jsonb_typeof(item.value) <> 'object'
           or nullif(item.value->>'squad_member_id', '') is null
    ) then
        raise exception 'Every matchday squad item must contain a squad member.'
            using errcode = '22023';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(v_members) as item(value)
        where coalesce(item.value->>'selection_role', 'starter')
              not in ('starter', 'substitute')
    ) then
        raise exception 'Selection role must be starter or substitute.'
            using errcode = '22023';
    end if;

    if exists (
        select 1
        from (
            select
                (item.value->>'squad_member_id')::uuid as squad_member_id,
                count(*) as occurrences
            from jsonb_array_elements(v_members) as item(value)
            group by (item.value->>'squad_member_id')::uuid
        ) duplicated
        where duplicated.occurrences > 1
    ) then
        raise exception 'A player can only appear once in a matchday squad.'
            using errcode = '23505';
    end if;

    select count(*)
    into v_captain_count
    from jsonb_array_elements(v_members) as item(value)
    where coalesce((item.value->>'is_captain')::boolean, false) = true;

    if v_captain_count > 1 then
        raise exception 'Only one captain can be selected for a matchday squad.'
            using errcode = '22023';
    end if;

    select count(*)
    into v_valid_member_count
    from public.club_squad_members sm
    where sm.organisation_id = p_organisation_id
      and sm.season_id = v_fixture.season_id
      and sm.team_id = v_fixture.team_id
      and sm.id in (
          select (item.value->>'squad_member_id')::uuid
          from jsonb_array_elements(v_members) as item(value)
      )
      and (
          sm.active = true
          or exists (
              select 1
              from public.club_match_squads existing_squad
              join public.club_match_squad_members existing_member
                on existing_member.match_squad_id = existing_squad.id
              where existing_squad.fixture_id = p_fixture_id
                and existing_member.squad_member_id = sm.id
          )
      );

    if v_valid_member_count <> v_member_count then
        raise exception 'One or more selected players do not belong to this team and season.'
            using errcode = '23503';
    end if;

    -- Draft squads are deliberately private. Existing public state is only
    -- retained when a confirmed squad is explicitly saved as published.
    v_effective_published := p_status = 'confirmed' and coalesce(p_published, false);

    insert into public.club_match_squads (
        organisation_id,
        season_id,
        team_id,
        fixture_id,
        status,
        published,
        notes
    ) values (
        p_organisation_id,
        v_fixture.season_id,
        v_fixture.team_id,
        p_fixture_id,
        p_status,
        v_effective_published,
        nullif(btrim(coalesce(p_notes, '')), '')
    )
    on conflict (fixture_id)
    do update set
        status = excluded.status,
        published = excluded.published,
        notes = excluded.notes,
        updated_at = now()
    returning id into v_match_squad_id;

    -- Upsert the complete requested selection. Player name, shirt number and
    -- position are snapshotted from the authoritative season squad rather than
    -- trusted from browser input. Existing appearance_status is intentionally
    -- preserved on conflict.
    insert into public.club_match_squad_members (
        organisation_id,
        match_squad_id,
        squad_member_id,
        selection_role,
        appearance_status,
        squad_number,
        position,
        player_name,
        is_captain,
        is_goalkeeper,
        sort_order
    )
    select
        p_organisation_id,
        v_match_squad_id,
        sm.id,
        coalesce(item.value->>'selection_role', 'starter'),
        'selected',
        sm.squad_number,
        sm.position,
        coalesce(
            nullif(
                btrim(
                    concat_ws(
                        ' ',
                        nullif(btrim(cp.first_name), ''),
                        nullif(btrim(cp.last_name), '')
                    )
                ),
                ''
            ),
            'Player'
        ),
        coalesce((item.value->>'is_captain')::boolean, false),
        coalesce((item.value->>'is_goalkeeper')::boolean, false),
        (item.ordinality - 1)::integer
    from jsonb_array_elements(v_members) with ordinality as item(value, ordinality)
    join public.club_squad_members sm
      on sm.id = (item.value->>'squad_member_id')::uuid
    join public.club_players cp
      on cp.id = sm.player_id
    on conflict (match_squad_id, squad_member_id)
    do update set
        selection_role = excluded.selection_role,
        squad_number = excluded.squad_number,
        position = excluded.position,
        player_name = excluded.player_name,
        is_captain = excluded.is_captain,
        is_goalkeeper = excluded.is_goalkeeper,
        sort_order = excluded.sort_order,
        updated_at = now();

    -- Remove selections that are no longer present. This only runs before any
    -- match activity exists because of the guard above.
    delete from public.club_match_squad_members msm
    where msm.match_squad_id = v_match_squad_id
      and not exists (
          select 1
          from jsonb_array_elements(v_members) as item(value)
          where (item.value->>'squad_member_id')::uuid = msm.squad_member_id
      );

    return jsonb_build_object(
        'match_squad_id', v_match_squad_id,
        'fixture_id', p_fixture_id,
        'status', p_status,
        'published', v_effective_published,
        'member_count', v_member_count
    );
end;
$$;

revoke all on function public.club_match_centre_save_squad(
    uuid,
    uuid,
    text,
    boolean,
    text,
    jsonb
) from public, anon;

grant execute on function public.club_match_centre_save_squad(
    uuid,
    uuid,
    text,
    boolean,
    text,
    jsonb
) to authenticated;

comment on function public.club_match_centre_save_squad(
    uuid,
    uuid,
    text,
    boolean,
    text,
    jsonb
) is
'TournamentHQ Club Match Centre: atomically creates/updates a fixture matchday squad and its selected members while protecting completed or active match history.';

commit;
