begin;
create table if not exists public.club_calendar_coaches (
 organisation_id uuid not null references public.organisations(id) on delete cascade,
 team_id uuid not null references public.teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(team_id,user_id)
);
create table if not exists public.club_calendar_events (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
 team_id uuid not null references public.teams(id) on delete cascade, season_id uuid not null references public.club_seasons(id) on delete cascade,
 series_id uuid, title text not null check(length(trim(title)) between 1 and 160),
 event_type text not null default 'training' check(event_type in ('training','club_event')),
 starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null default 'Europe/London',
 venue text not null default '', notes text not null default '', status text not null default 'scheduled' check(status in ('scheduled','cancelled')),
 reminder_minutes integer check(reminder_minutes in (60,120,1440,2880)),
 reminder_channels text[] not null default array['email']::text[] check(reminder_channels <@ array['email','whatsapp']::text[]),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '2 days'), unique(series_id,starts_at)
);
create index if not exists calendar_upcoming on public.club_calendar_events(organisation_id,starts_at) where status='scheduled';
create table if not exists public.club_calendar_attendance (
 event_id uuid not null references public.club_calendar_events(id) on delete cascade,
 squad_member_id uuid not null references public.club_squad_members(id) on delete cascade,
 attendance text not null default 'unknown' check(attendance in ('unknown','present','absent','late','excused')),
 updated_at timestamptz not null default now(), primary key(event_id,squad_member_id)
);
create table if not exists public.club_calendar_reminders (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.club_calendar_events(id) on delete cascade,
 contact_id uuid not null references public.communication_contacts(id) on delete cascade,
 channel text not null check(channel in ('email','whatsapp')), status text not null default 'processing' check(status in ('processing','accepted','dry_run','failed')),
 provider_message_id text, error_message text, token_hash text not null, response text check(response in ('yes','no','maybe')),
 responded_at timestamptz, created_at timestamptz not null default now(), unique(event_id,contact_id,channel)
);
alter table public.club_calendar_events enable row level security;
alter table public.club_calendar_coaches enable row level security;
alter table public.club_calendar_attendance enable row level security;
alter table public.club_calendar_reminders enable row level security;

create or replace function public.calendar_is_admin(p_org uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.platform_admins where user_id=auth.uid() and active)
 or exists(select 1 from public.organisation_memberships where organisation_id=p_org and user_id=auth.uid() and active and role in ('super_admin','competition_manager'));
$$;
create or replace function public.calendar_can_manage(p_org uuid,p_team uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.organisations o join public.teams t on t.organisation_id=o.id
 where o.id=p_org and t.id=p_team and o.organisation_type='club' and o.status='active'
 and o.subscription_status in ('active','trial','past_due')
 and (o.subscription_status<>'trial' or o.trial_end>now())
 and 'Calendar'=any(o.enabled_modules)
 and (o.pilot_expires_at is null or o.pilot_expires_at>now() or o.subscription_status='active'))
 and (public.calendar_is_admin(p_org) or exists(select 1 from public.club_calendar_coaches cc
 join public.organisation_memberships m on m.organisation_id=cc.organisation_id and m.user_id=cc.user_id
 where cc.organisation_id=p_org and cc.team_id=p_team and cc.user_id=auth.uid() and m.active and m.role='match_official'));
$$;
revoke all on function public.calendar_is_admin(uuid),public.calendar_can_manage(uuid,uuid) from public;
grant execute on function public.calendar_is_admin(uuid),public.calendar_can_manage(uuid,uuid) to authenticated;
create policy calendar_events_access on public.club_calendar_events for all to authenticated
 using(public.calendar_can_manage(organisation_id,team_id)) with check(public.calendar_can_manage(organisation_id,team_id));
create policy calendar_coaches_read on public.club_calendar_coaches for select to authenticated
 using(public.calendar_is_admin(organisation_id) or user_id=auth.uid());
create policy calendar_coaches_write on public.club_calendar_coaches for all to authenticated
 using(public.calendar_is_admin(organisation_id)) with check(public.calendar_is_admin(organisation_id)
 and exists(select 1 from public.teams where id=team_id and organisation_id=club_calendar_coaches.organisation_id)
 and exists(select 1 from public.organisation_memberships where user_id=club_calendar_coaches.user_id and organisation_id=club_calendar_coaches.organisation_id and active));
create policy calendar_attendance_access on public.club_calendar_attendance for all to authenticated
 using(exists(select 1 from public.club_calendar_events e where e.id=event_id and public.calendar_can_manage(e.organisation_id,e.team_id)))
 with check(exists(select 1 from public.club_calendar_events e join public.club_squad_members sm on sm.team_id=e.team_id and sm.organisation_id=e.organisation_id and sm.season_id=e.season_id
 where e.id=event_id and sm.id=squad_member_id and public.calendar_can_manage(e.organisation_id,e.team_id)));
create policy calendar_reminders_read on public.club_calendar_reminders for select to authenticated
 using(exists(select 1 from public.club_calendar_events e where e.id=event_id and public.calendar_can_manage(e.organisation_id,e.team_id)));
revoke all on public.club_calendar_reminders from anon,authenticated;
grant select on public.club_calendar_reminders to authenticated;

create or replace function public.validate_calendar_event()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from public.club_seasons where id=new.season_id and organisation_id=new.organisation_id)
 or not exists(select 1 from public.teams where id=new.team_id and organisation_id=new.organisation_id) then raise exception 'Select a team and season from this organisation.'; end if;
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone.'; end if;
 if tg_op='UPDATE' and (new.organisation_id,new.team_id,new.season_id,new.series_id,new.created_by) is distinct from (old.organisation_id,old.team_id,old.season_id,old.series_id,old.created_by) then
  raise exception 'Calendar ownership and series cannot be changed.'; end if;
 if tg_op='INSERT' and new.created_by is distinct from auth.uid() then raise exception 'Invalid event creator.'; end if;
 new.updated_at=now();return new;
end $$;
create trigger validate_calendar_event before insert or update on public.club_calendar_events for each row execute function public.validate_calendar_event();

-- Generate occurrences in local wall-clock time; AT TIME ZONE handles daylight saving.
create or replace function public.create_calendar_series(p_org uuid,p_team uuid,p_season uuid,p_title text,p_type text,
 p_start timestamp,p_end timestamp,p_timezone text,p_venue text,p_notes text,p_repeat text,p_until date,
 p_reminder integer,p_channels text[])
returns integer language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_step interval;v_date timestamp;v_until timestamp;v_series uuid;v_count integer:=0;
begin
 if not public.calendar_can_manage(p_org,p_team) then raise exception 'Calendar access required.' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_end<=p_start or p_end>p_start+interval '2 days' then raise exception 'Choose valid start and end times.'; end if;
 if p_repeat not in ('none','weekly','fortnightly') or p_repeat is null then raise exception 'Invalid repeat option.'; end if;
 if p_repeat<>'none' and (p_until is null or p_until<p_start::date or p_until>p_start::date+366) then raise exception 'Repeat end date must be within one year of the first session.'; end if;
 v_step=case when p_repeat='fortnightly' then interval '14 days' else interval '7 days' end;
 v_until=case when p_repeat='none' then p_start else p_until+p_start::time end;
 v_series=case when p_repeat='none' then null else gen_random_uuid() end;
 for v_date in select generate_series(p_start,v_until,v_step) loop
  if (v_date at time zone p_timezone) at time zone p_timezone <> v_date
   or ((v_date+(p_end-p_start)) at time zone p_timezone) at time zone p_timezone <> v_date+(p_end-p_start) then
   raise exception 'A recurring time does not exist when the clocks change. Choose another time.';
  end if;
  insert into public.club_calendar_events(organisation_id,team_id,season_id,series_id,title,event_type,starts_at,ends_at,timezone,venue,notes,reminder_minutes,reminder_channels,created_by)
  values(p_org,p_team,p_season,v_series,trim(p_title),p_type,v_date at time zone p_timezone,(v_date+(p_end-p_start)) at time zone p_timezone,p_timezone,coalesce(p_venue,''),coalesce(p_notes,''),p_reminder,p_channels,auth.uid());
  v_count=v_count+1;
 end loop;return v_count;
end $$;
grant execute on function public.create_calendar_series(uuid,uuid,uuid,text,text,timestamp,timestamp,text,text,text,text,date,integer,text[]) to authenticated;
revoke all on function public.create_calendar_series(uuid,uuid,uuid,text,text,timestamp,timestamp,text,text,text,text,date,integer,text[]) from public;

-- Worker claims each recipient/channel once, even if cron executions overlap.
-- Processing jobs are never replayed automatically after an ambiguous provider timeout.
create or replace function public.claim_calendar_reminders(p_limit integer default 50)
returns table(job_id uuid,token text) language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare rec record;v_token text;v_id uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server access required.'; end if;
 for rec in
 select e.id as event_id,c.id as contact_id,ch.channel
 from public.club_calendar_events e join public.organisations o on o.id=e.organisation_id
 join public.communication_contacts c on c.organisation_id=e.organisation_id and c.team_id=e.team_id and c.active
 cross join lateral unnest(e.reminder_channels) ch(channel)
 where e.status='scheduled' and e.reminder_minutes is not null and e.starts_at>now()
 and e.starts_at-make_interval(mins=>e.reminder_minutes)<=now()
 and o.status='active' and o.subscription_status in ('active','trial','past_due') and 'Calendar'=any(o.enabled_modules)
 and (o.subscription_status<>'trial' or o.trial_end>now())
 and (o.pilot_expires_at is null or o.pilot_expires_at>now() or o.subscription_status='active')
 and ((ch.channel='email' and c.operational_email_enabled and c.email is not null)
 or(ch.channel='whatsapp' and c.operational_whatsapp_enabled and coalesce(c.whatsapp_e164,c.phone_e164) is not null))
 and not exists(select 1 from public.club_calendar_reminders r where r.event_id=e.id and r.contact_id=c.id and r.channel=ch.channel)
 order by e.starts_at,c.id limit least(greatest(p_limit,1),50)
 loop
  v_token=encode(gen_random_bytes(32),'hex');v_id=null;
  insert into public.club_calendar_reminders(event_id,contact_id,channel,token_hash)
  values(rec.event_id,rec.contact_id,rec.channel,encode(digest(v_token,'sha256'),'hex'))
  on conflict(event_id,contact_id,channel) do nothing returning id into v_id;
  if v_id is not null then job_id=v_id;token=v_token;return next;end if;
 end loop;
end $$;
revoke all on function public.claim_calendar_reminders(integer) from public;
grant execute on function public.claim_calendar_reminders(integer) to service_role;

create or replace function public.calendar_rsvp(p_token text,p_response text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare rec record;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
 select r.id,r.event_id,r.contact_id,r.response,e.title,e.starts_at,e.ends_at,e.timezone,e.venue,e.status,o.name as organisation_name
 into rec from public.club_calendar_reminders r join public.club_calendar_events e on e.id=r.event_id
 join public.organisations o on o.id=e.organisation_id
 where r.token_hash=encode(digest(p_token,'sha256'),'hex') and e.ends_at+interval '1 day'>now()
 and e.status='scheduled' and o.status='active' and r.status in ('accepted','dry_run');
 if rec.id is null then return null; end if;
 if p_response is not null then
  if p_response not in ('yes','no','maybe') or rec.starts_at<=now() then raise exception 'This session is no longer accepting replies.'; end if;
  update public.club_calendar_reminders set response=p_response,responded_at=now() where event_id=rec.event_id and contact_id=rec.contact_id;
  rec.response=p_response;
 end if;
 return jsonb_build_object('title',rec.title,'startsAt',rec.starts_at,'endsAt',rec.ends_at,'timezone',rec.timezone,'venue',rec.venue,'organisation',rec.organisation_name,'response',rec.response);
end $$;
revoke all on function public.calendar_rsvp(text,text) from public;
grant execute on function public.calendar_rsvp(text,text) to anon,authenticated;
-- Existing club subscribers receive the calendar; suspended tenants retain onboarding gates.
update public.organisations set enabled_modules=array_append(enabled_modules,'Calendar') where organisation_type='club' and not ('Calendar'=any(enabled_modules));
create or replace function public.get_calendar_responses(p_event uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_event public.club_calendar_events;
begin
 select * into v_event from public.club_calendar_events where id=p_event;
 if v_event.id is null or not public.calendar_can_manage(v_event.organisation_id,v_event.team_id) then raise exception 'Calendar access required.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('contactName',c.display_name,'channel',r.channel,'status',r.status,'response',r.response,'error',r.error_message)) from public.club_calendar_reminders r join public.communication_contacts c on c.id=r.contact_id where r.event_id=p_event),'[]'::jsonb);
end $$;
revoke all on function public.get_calendar_responses(uuid) from public;
grant execute on function public.get_calendar_responses(uuid) to authenticated;
commit;
