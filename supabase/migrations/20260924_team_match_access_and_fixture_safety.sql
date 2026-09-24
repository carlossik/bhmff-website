-- Apply after the competition rules migrations. Existing match officials have no
-- assignment and cannot write competition match data until an admin assigns one.
create table public.competition_team_official_assignments (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  competition_team_id uuid not null references public.competition_teams(id) on delete cascade,
  primary key (competition_id, user_id),
  unique (organisation_id, user_id),
  foreign key (organisation_id, user_id)
    references public.organisation_memberships(organisation_id, user_id) on delete cascade
);
create index on public.competition_team_official_assignments (user_id, competition_team_id);
alter table public.competition_team_official_assignments enable row level security;
revoke all on public.competition_team_official_assignments from anon, authenticated;
grant select on public.competition_team_official_assignments to authenticated;
grant all on public.competition_team_official_assignments to service_role;
create policy "Officials see their own team assignment" on public.competition_team_official_assignments
  for select to authenticated using (user_id = (select auth.uid()) or exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = competition_team_official_assignments.organisation_id
      and m.user_id = (select auth.uid()) and m.active and m.role = 'super_admin'
  ));

create or replace function public.set_competition_team_official_assignment(
  p_organisation uuid, p_user uuid, p_competition uuid, p_team uuid
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.organisation_memberships m join public.profiles p on p.id = m.user_id
    where m.organisation_id = p_organisation and m.user_id = auth.uid()
      and m.active and p.active and m.role = 'super_admin'
  ) then raise exception 'Only an active organisation administrator can assign officials'; end if;
  if not exists (select 1 from public.organisation_memberships
      where organisation_id = p_organisation and user_id = p_user) then
    raise exception 'User is not a member of this organisation';
  end if;
  if p_competition is null then
    if p_team is not null then raise exception 'Competition is required'; end if;
    delete from public.competition_team_official_assignments
      where organisation_id = p_organisation and user_id = p_user;
    return;
  end if;
  if not exists (select 1 from public.competitions where id = p_competition and organisation_id = p_organisation) then
    raise exception 'Competition does not belong to this organisation';
  end if;
  if p_team is null then
    delete from public.competition_team_official_assignments
      where organisation_id = p_organisation and user_id = p_user and competition_id = p_competition;
  else
    if not exists (select 1 from public.competition_teams where id = p_team and competition_id = p_competition) then
      raise exception 'Team does not belong to this competition';
    end if;
    insert into public.competition_team_official_assignments (organisation_id, user_id, competition_id, competition_team_id)
      values (p_organisation, p_user, p_competition, p_team)
      on conflict (organisation_id, user_id) do update set competition_team_id = excluded.competition_team_id,
        competition_id = excluded.competition_id;
  end if;
end;
$$;
revoke all on function public.set_competition_team_official_assignment(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.set_competition_team_official_assignment(uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.validate_official_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.competitions c join public.competition_teams t on t.competition_id = c.id
    where c.id = new.competition_id and c.organisation_id = new.organisation_id
      and t.id = new.competition_team_id) then
    raise exception 'Assigned team and competition must belong to the organisation';
  end if;
  return new;
end;
$$;
create trigger validate_official_assignment before insert or update on public.competition_team_official_assignments
  for each row execute function public.validate_official_assignment();

create or replace function public.can_write_competition_match(p_competition uuid, p_fixture uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.fixtures f
    join public.competitions c on c.id = f.competition_id
    join public.organisation_memberships m on m.organisation_id = c.organisation_id
    join public.profiles p on p.id = m.user_id
    where f.id = p_fixture and f.competition_id = p_competition
      and m.user_id = (select auth.uid()) and m.active and p.active
      and (
        m.role in ('super_admin', 'competition_manager')
        or (m.role = 'match_official' and exists (
          select 1 from public.competition_team_official_assignments a
          where a.organisation_id = c.organisation_id and a.competition_id = f.competition_id
            and a.user_id = m.user_id
            and a.competition_team_id in (f.home_competition_team_id, f.away_competition_team_id)
        ))
      )
  );
$$;
revoke all on function public.can_write_competition_match(uuid, uuid) from public, anon;
grant execute on function public.can_write_competition_match(uuid, uuid) to authenticated;

create or replace function public.can_manage_competition_fixture(p_competition uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.competitions c
    join public.organisation_memberships m on m.organisation_id = c.organisation_id
    join public.profiles p on p.id = m.user_id
    where c.id = p_competition and m.user_id = (select auth.uid()) and m.active and p.active
      and m.role in ('super_admin', 'competition_manager')
  );
$$;
revoke all on function public.can_manage_competition_fixture(uuid) from public, anon;
grant execute on function public.can_manage_competition_fixture(uuid) to authenticated;

create or replace function public.fixture_has_match_data(p_fixture uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_competition uuid;
begin
  select competition_id into v_competition from public.fixtures where id = p_fixture;
  if v_competition is null or not public.can_manage_competition_fixture(v_competition) then
    raise exception 'Fixture unavailable to this competition administrator';
  end if;
  return exists(select 1 from public.results where fixture_id = p_fixture)
    or exists(select 1 from public.goals where fixture_id = p_fixture);
end;
$$;
revoke all on function public.fixture_has_match_data(uuid) from public, anon;
grant execute on function public.fixture_has_match_data(uuid) to authenticated;

-- Restrictive policies intersect all existing permissive write policies,
-- including legacy FOR ALL policies. Read policies stay untouched.
alter table public.fixtures enable row level security;
alter table public.results enable row level security;
alter table public.goals enable row level security;
create policy "Competition fixture manager insert" on public.fixtures as restrictive for insert to authenticated
  with check (competition_id is null or public.can_manage_competition_fixture(competition_id));
create policy "Competition fixture manager update" on public.fixtures as restrictive for update to authenticated
  using (competition_id is null or public.can_manage_competition_fixture(competition_id))
  with check (competition_id is null or public.can_manage_competition_fixture(competition_id));
create policy "Competition fixture manager delete" on public.fixtures as restrictive for delete to authenticated
  using (competition_id is null or public.can_manage_competition_fixture(competition_id));
create policy "Competition manager can add fixtures" on public.fixtures for insert to authenticated
  with check (competition_id is not null and public.can_manage_competition_fixture(competition_id));
create policy "Competition manager can edit fixtures" on public.fixtures for update to authenticated
  using (competition_id is not null and public.can_manage_competition_fixture(competition_id))
  with check (competition_id is not null and public.can_manage_competition_fixture(competition_id));
create policy "Competition manager can remove fixtures" on public.fixtures for delete to authenticated
  using (competition_id is not null and public.can_manage_competition_fixture(competition_id));
create policy "Assigned team result insert" on public.results as restrictive for insert to authenticated
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Assigned team result update" on public.results as restrictive for update to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id))
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Assigned team result delete" on public.results as restrictive for delete to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id));
create policy "Permitted match result insert" on public.results for insert to authenticated
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Permitted match result update" on public.results for update to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id))
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Permitted match result delete" on public.results for delete to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id));
create policy "Assigned team goal insert" on public.goals as restrictive for insert to authenticated
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Assigned team goal update" on public.goals as restrictive for update to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id))
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Assigned team goal delete" on public.goals as restrictive for delete to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id));
create policy "Permitted match goal insert" on public.goals for insert to authenticated
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Permitted match goal update" on public.goals for update to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id))
  with check (public.can_write_competition_match(competition_id, fixture_id));
create policy "Permitted match goal delete" on public.goals for delete to authenticated
  using (public.can_write_competition_match(competition_id, fixture_id));

-- Trigger validation also covers privileged writes and concurrent edits.
create or replace function public.validate_competition_match_record()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_fixture public.fixtures%rowtype;
begin
  select * into v_fixture from public.fixtures where id = new.fixture_id for share;
  if not found or new.competition_id is distinct from v_fixture.competition_id then
    raise exception 'Match record must belong to its fixture and competition';
  end if;
  if tg_table_name = 'goals' then
    if new.team_id is not null and not exists (
      select 1 from public.competition_teams ct where ct.team_id = new.team_id
        and ct.id in (v_fixture.home_competition_team_id, v_fixture.away_competition_team_id)
    ) then
      raise exception 'Goal team must participate in the fixture';
    end if;
  end if;
  return new;
end;
$$;
create trigger validate_competition_result before insert or update on public.results
  for each row execute function public.validate_competition_match_record();
create trigger validate_competition_goal before insert or update on public.goals
  for each row execute function public.validate_competition_match_record();

create or replace function public.protect_recorded_fixture()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if exists(select 1 from public.results where fixture_id = old.id)
      or exists(select 1 from public.goals where fixture_id = old.id) then
      raise exception 'Remove recorded results and goals before deleting this fixture';
    end if;
    return old;
  end if;
  if new.home_competition_team_id is distinct from old.home_competition_team_id
    or new.away_competition_team_id is distinct from old.away_competition_team_id then
    if old.status = 'completed' or exists(select 1 from public.results where fixture_id = old.id)
      or exists(select 1 from public.goals where fixture_id = old.id) then
      raise exception 'Cannot change teams after a fixture is completed or has results or goals';
    end if;
  end if;
  if new.competition_id is distinct from old.competition_id then
    raise exception 'Cannot move an existing fixture to another competition';
  end if;
  if new.home_competition_team_id is not null and not exists (
    select 1 from public.competition_teams where id = new.home_competition_team_id and competition_id = new.competition_id
  ) or new.away_competition_team_id is not null and not exists (
    select 1 from public.competition_teams where id = new.away_competition_team_id and competition_id = new.competition_id
  ) or new.home_competition_team_id is not null and new.home_competition_team_id = new.away_competition_team_id then
    raise exception 'Fixture teams must be distinct and belong to the competition';
  end if;
  return new;
end;
$$;
create trigger protect_recorded_fixture before update or delete on public.fixtures
  for each row execute function public.protect_recorded_fixture();
