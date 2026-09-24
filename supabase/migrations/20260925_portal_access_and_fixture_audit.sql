-- Apply after 20260924_team_match_access_and_fixture_safety.sql.
-- Counts begin when this migration and its accompanying application code are deployed.
create table public.portal_invitations (
  organisation_id uuid not null,
  user_id uuid not null,
  invited_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  send_count integer not null default 1 check (send_count > 0),
  accepted_at timestamptz,
  primary key (organisation_id, user_id),
  foreign key (organisation_id, user_id)
    references public.organisation_memberships(organisation_id, user_id) on delete cascade
);

create table public.portal_sign_in_sessions (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  first_portal_access_at timestamptz not null default now(),
  primary key (organisation_id, user_id, session_id),
  foreign key (organisation_id, user_id)
    references public.organisation_memberships(organisation_id, user_id) on delete cascade
);
create index portal_sign_in_sessions_user_time_idx
  on public.portal_sign_in_sessions(organisation_id, user_id, first_portal_access_at desc);

create table public.fixture_audit_log (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  fixture_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  source text not null default 'fixture' check (source in ('fixture', 'official_assignment')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_email text,
  changed_fields text[] not null default '{}',
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);
create index fixture_audit_log_competition_time_idx
  on public.fixture_audit_log(competition_id, changed_at desc);
create index fixture_audit_log_fixture_time_idx
  on public.fixture_audit_log(fixture_id, changed_at desc);

alter table public.portal_invitations enable row level security;
alter table public.portal_sign_in_sessions enable row level security;
alter table public.fixture_audit_log enable row level security;
revoke all on public.portal_invitations, public.portal_sign_in_sessions, public.fixture_audit_log from anon, authenticated;
grant select on public.portal_invitations, public.portal_sign_in_sessions, public.fixture_audit_log to authenticated;
grant all on public.portal_invitations, public.portal_sign_in_sessions, public.fixture_audit_log to service_role;

create or replace function public.can_view_organisation_audit(p_organisation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organisation_memberships m
    join public.profiles p on p.id = m.user_id
    where m.organisation_id = p_organisation and m.user_id = auth.uid()
      and m.active and p.active and m.role in ('super_admin', 'competition_manager')
  );
$$;
revoke all on function public.can_view_organisation_audit(uuid) from public, anon;
grant execute on function public.can_view_organisation_audit(uuid) to authenticated;

create policy "Administrators read invitation progress" on public.portal_invitations
  for select to authenticated using (public.can_view_organisation_audit(organisation_id));
create policy "Administrators read portal sessions" on public.portal_sign_in_sessions
  for select to authenticated using (public.can_view_organisation_audit(organisation_id));
create policy "Administrators read fixture history" on public.fixture_audit_log
  for select to authenticated using (public.can_view_organisation_audit(organisation_id));

-- Only the authenticated invitee may mark their own existing invitation accepted.
create or replace function public.accept_portal_invitation(p_organisation uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.organisation_memberships m
    where m.organisation_id = p_organisation and m.user_id = auth.uid() and m.active
  ) then
    raise exception 'This invitation does not belong to the signed-in user';
  end if;
  update public.portal_invitations
    set accepted_at = coalesce(accepted_at, now())
    where organisation_id = p_organisation and user_id = auth.uid();
end;
$$;
revoke all on function public.accept_portal_invitation(uuid) from public, anon;
grant execute on function public.accept_portal_invitation(uuid) to authenticated;

-- One row per authenticated Supabase session, regardless of refreshes or tabs.
-- The session ID comes exclusively from the verified JWT, never a client argument.
create or replace function public.record_portal_session(p_organisation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_session uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.organisation_memberships m
    join public.profiles p on p.id = m.user_id
    where m.organisation_id = p_organisation and m.user_id = auth.uid() and m.active and p.active
  ) then
    raise exception 'Active portal membership required';
  end if;
  v_session := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  if v_session is null then raise exception 'Supabase session ID unavailable'; end if;
  insert into public.portal_sign_in_sessions(organisation_id, user_id, session_id)
    values (p_organisation, auth.uid(), v_session)
    on conflict (organisation_id, user_id, session_id) do nothing;
end;
$$;
revoke all on function public.record_portal_session(uuid) from public, anon;
grant execute on function public.record_portal_session(uuid) to authenticated;

create or replace function public.portal_access_summary(p_organisation uuid)
returns table (
  user_id uuid, invited_at timestamptz, last_sent_at timestamptz,
  accepted_at timestamptz, send_count integer,
  sign_in_count bigint, first_signed_in_at timestamptz, last_signed_in_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.organisation_memberships m
    join public.profiles p on p.id = m.user_id
    where m.organisation_id = p_organisation and m.user_id = auth.uid()
      and m.active and p.active and m.role = 'super_admin'
  ) then raise exception 'Only an active organisation admin can view user access'; end if;
  return query
    select m.user_id, i.invited_at, i.last_sent_at, i.accepted_at, i.send_count,
      count(s.session_id)::bigint, min(s.first_portal_access_at), max(s.first_portal_access_at)
    from public.organisation_memberships m
    left join public.portal_invitations i
      on i.organisation_id = m.organisation_id and i.user_id = m.user_id
    left join public.portal_sign_in_sessions s
      on s.organisation_id = m.organisation_id and s.user_id = m.user_id
    where m.organisation_id = p_organisation
    group by m.user_id, i.invited_at, i.last_sent_at, i.accepted_at, i.send_count;
end;
$$;
revoke all on function public.portal_access_summary(uuid) from public, anon;
grant execute on function public.portal_access_summary(uuid) to authenticated;

-- Retain deleted-fixture records: fixture_id deliberately has no FK to fixtures.
create or replace function public.capture_fixture_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_competition uuid;
  v_fixture uuid;
  v_organisation uuid;
  v_fields text[];
  v_actor_name text;
  v_actor_email text;
begin
  if tg_op = 'INSERT' then
    v_before := null; v_after := to_jsonb(new);
    v_competition := new.competition_id; v_fixture := new.id;
  elsif tg_op = 'DELETE' then
    v_before := to_jsonb(old); v_after := null;
    v_competition := old.competition_id; v_fixture := old.id;
  else
    v_before := to_jsonb(old); v_after := to_jsonb(new);
    v_competition := new.competition_id; v_fixture := new.id;
  end if;
  -- Older, non-competition fixtures have no organisation scope.
  if v_competition is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select organisation_id into v_organisation from public.competitions where id = v_competition;
  if v_organisation is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select coalesce(array_agg(key order by key), array[]::text[]) into v_fields
    from jsonb_object_keys(coalesce(v_before, '{}'::jsonb) || coalesce(v_after, '{}'::jsonb)) as keys(key)
    where v_before -> key is distinct from v_after -> key;
  if tg_op = 'UPDATE' and cardinality(v_fields) = 0 then return new; end if;
  select full_name, email into v_actor_name, v_actor_email
    from public.profiles where id = auth.uid();
  insert into public.fixture_audit_log (
    organisation_id, competition_id, fixture_id, action, source, actor_user_id,
    actor_name, actor_email, changed_fields, before_data, after_data
  ) values (
    v_organisation, v_competition, v_fixture, tg_op, 'fixture', auth.uid(),
    v_actor_name, v_actor_email, v_fields, v_before, v_after
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger capture_fixture_audit_after_change
  after insert or update or delete on public.fixtures
  for each row execute function public.capture_fixture_audit();

-- The fixture editor also changes referee assignments through a separate table.
create or replace function public.capture_fixture_assignment_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_fixture uuid;
  v_competition uuid;
  v_organisation uuid;
  v_fields text[];
  v_actor_name text;
  v_actor_email text;
begin
  if tg_op = 'INSERT' then
    v_before := null; v_after := to_jsonb(new); v_fixture := new.fixture_id;
  elsif tg_op = 'DELETE' then
    v_before := to_jsonb(old); v_after := null; v_fixture := old.fixture_id;
  else
    v_before := to_jsonb(old); v_after := to_jsonb(new);
    v_fixture := coalesce(new.fixture_id, old.fixture_id);
  end if;
  if v_fixture is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select f.competition_id, c.organisation_id into v_competition, v_organisation
    from public.fixtures f join public.competitions c on c.id = f.competition_id
    where f.id = v_fixture;
  if v_competition is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select coalesce(array_agg(key order by key), array[]::text[]) into v_fields
    from jsonb_object_keys(coalesce(v_before, '{}'::jsonb) || coalesce(v_after, '{}'::jsonb)) as keys(key)
    where v_before -> key is distinct from v_after -> key;
  if tg_op = 'UPDATE' and cardinality(v_fields) = 0 then return new; end if;
  select full_name, email into v_actor_name, v_actor_email
    from public.profiles where id = auth.uid();
  insert into public.fixture_audit_log (
    organisation_id, competition_id, fixture_id, action, source, actor_user_id,
    actor_name, actor_email, changed_fields, before_data, after_data
  ) values (
    v_organisation, v_competition, v_fixture, tg_op, 'official_assignment', auth.uid(),
    v_actor_name, v_actor_email, v_fields, v_before, v_after
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
do $$ begin
  if to_regclass('public.official_assignments') is not null then
    create trigger capture_fixture_assignment_audit_after_change
      after insert or update or delete on public.official_assignments
      for each row execute function public.capture_fixture_assignment_audit();
  end if;
end $$;
