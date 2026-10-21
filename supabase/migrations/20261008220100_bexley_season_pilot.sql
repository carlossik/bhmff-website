begin;
alter table public.organisations add column if not exists pilot_expires_at timestamptz;
alter table public.organisations add column if not exists pilot_campaign text;
alter table public.organisations add column if not exists pilot_max_teams integer;

create table if not exists public.season_pilot_invites (
 email text primary key check(email=lower(trim(email))),
 campaign text not null default 'bexley-borough-2026-27',
 organisation_id uuid unique references public.organisations(id) on delete set null,
 approved_by uuid references auth.users(id), approved_at timestamptz not null default now(),
 redeemed_by uuid references auth.users(id), redeemed_at timestamptz
);
alter table public.season_pilot_invites enable row level security;
revoke all on public.season_pilot_invites from anon,authenticated;

create or replace function public.approve_bexley_pilot_email(p_email text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid() and active) then
  raise exception 'Platform administrator access required.' using errcode='42501'; end if;
 if p_email is null or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid registration email.'; end if;
 insert into public.season_pilot_invites(email,approved_by) values(lower(trim(p_email)),auth.uid())
 on conflict(email) do nothing;
end $$;
revoke all on function public.approve_bexley_pilot_email(text) from public;
grant execute on function public.approve_bexley_pilot_email(text) to authenticated;

create or replace function public.redeem_bexley_pilot(p_organisation uuid,p_user uuid,p_code text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_email text; v_invite public.season_pilot_invites; v_org public.organisations;
 v_expiry timestamptz := '2027-07-01 00:00:00 Europe/London'::timestamptz;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server access required.' using errcode='42501'; end if;
 if upper(trim(p_code)) is distinct from 'BEXLEY2027' or now() >= v_expiry then raise exception 'This pilot code is invalid or has expired.'; end if;
 -- Lock the campaign before checking single-club redemption (concurrent requests cannot create two clubs).
 perform pg_advisory_xact_lock(hashtext('bexley-borough-2026-27'));
 select lower(email) into v_email from auth.users where id=p_user and email_confirmed_at is not null;
 select * into v_invite from public.season_pilot_invites where email=v_email for update;
 if v_invite.email is null then raise exception 'Use the approved Bexley Borough registration email. Contact TournamentHQ if it needs approving.'; end if;
 select * into v_org from public.organisations where id=p_organisation for update;
 if v_org.id is null or v_org.organisation_type <> 'club' or lower(trim(v_org.name)) not in ('bexley borough','bexley borough fc','bexley borough football club') then
  raise exception 'This season pass is restricted to Bexley Borough.'; end if;
 if not exists(select 1 from public.organisation_memberships where organisation_id=p_organisation and user_id=p_user and active and role='super_admin') then
  raise exception 'Organisation owner access required.'; end if;
 if exists(select 1 from public.season_pilot_invites where campaign=v_invite.campaign and organisation_id is not null and organisation_id<>p_organisation)
 or (v_invite.organisation_id is not null and v_invite.organisation_id<>p_organisation) then raise exception 'The Bexley season pass has already been used for another organisation.'; end if;
 if exists(select 1 from public.organisation_billing where organisation_id=p_organisation and stripe_subscription_id is not null) then
  raise exception 'This organisation already has Stripe billing. Resolve billing before applying a season pass.'; end if;
 if (select count(*) from public.teams where organisation_id=p_organisation)>3 then raise exception 'The pilot covers three teams.'; end if;
 update public.organisations set subscription_plan='professional',subscription_status='trial',trial_end=v_expiry,
  pilot_expires_at=v_expiry,pilot_campaign=v_invite.campaign,pilot_max_teams=3,
  max_users=10,max_competitions=10,public_site_enabled=true,
  enabled_modules=array['Dashboard','Club Profile & Website','Seasons','Teams','Opponents','Squad','Fixtures','Results','User Access','Calendar','Sports Officials','Trial Centre','Match Centre','Goals','Statistics','Club Finance','Communications','Sponsors','Articles','Media','Enquiries'],updated_at=now()
 where id=p_organisation;
 update public.season_pilot_invites set organisation_id=p_organisation,redeemed_by=p_user,redeemed_at=coalesce(redeemed_at,now()) where email=v_email;
end $$;
revoke all on function public.redeem_bexley_pilot(uuid,uuid,text) from public;
grant execute on function public.redeem_bexley_pilot(uuid,uuid,text) to service_role;

create or replace function public.protect_pilot_fields()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if auth.role()='service_role' or exists(select 1 from public.platform_admins where user_id=auth.uid() and active) then return new; end if;
 if tg_op='INSERT' then new.pilot_expires_at:=null;new.pilot_campaign:=null;new.pilot_max_teams:=null;
 elsif (new.pilot_expires_at,new.pilot_campaign,new.pilot_max_teams) is distinct from (old.pilot_expires_at,old.pilot_campaign,old.pilot_max_teams) then
  raise exception 'Season passes are managed by TournamentHQ.' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists protect_pilot_fields on public.organisations;
create trigger protect_pilot_fields before insert or update on public.organisations for each row execute function public.protect_pilot_fields();
create or replace function public.enforce_pilot_team_limit()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_limit integer;
begin
 select pilot_max_teams into v_limit from public.organisations where id=new.organisation_id and pilot_expires_at>now() for update;
 if v_limit is not null and (select count(*) from public.teams where organisation_id=new.organisation_id and id<>new.id)>=v_limit then
  raise exception 'The Bexley Borough pilot includes up to three teams.'; end if;
 return new;
end $$;
drop trigger if exists enforce_pilot_team_limit on public.teams;
create trigger enforce_pilot_team_limit before insert or update of organisation_id on public.teams for each row execute function public.enforce_pilot_team_limit();

-- The reminder worker calls this on its scheduled run. No Stripe objects or charges are created.
create or replace function public.expire_season_pilots()
returns void language sql security definer set search_path=pg_catalog,public as $$
 update public.organisations set subscription_status='cancelled',updated_at=now()
 where pilot_expires_at<=now() and subscription_status='trial' and pilot_campaign is not null;
$$;
revoke all on function public.expire_season_pilots() from public;
grant execute on function public.expire_season_pilots() to service_role;
-- Keep expired pilot access enforceable at the database, even before the next cron run.
create or replace function public.enforce_season_pilot_write_access()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_org uuid;
begin
 v_org=case when tg_op='DELETE' then old.organisation_id else new.organisation_id end;
 if exists(select 1 from public.organisations o where o.id=v_org and o.pilot_campaign is not null
  and o.pilot_expires_at<=now() and o.subscription_status<>'active')
  and not exists(select 1 from public.platform_admins where user_id=auth.uid() and active) then
  raise exception 'Your free season pass has ended. Choose a subscription to continue making changes.' using errcode='42501'; end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
do $$
declare v_table text;
begin
 for v_table in select table_name from information_schema.columns where table_schema='public' and column_name='organisation_id'
 and table_name in ('teams','club_seasons','club_players','club_squad_members','club_opponents','club_fixtures','club_results','club_goals','club_finance_charges','club_finance_payments','communication_messages','communication_contacts','articles','media') loop
 execute format('drop trigger if exists enforce_season_pilot_write_access on public.%I',v_table);
 execute format('create trigger enforce_season_pilot_write_access before insert or update or delete on public.%I for each row execute function public.enforce_season_pilot_write_access()',v_table);
 end loop;
end $$;
commit;
