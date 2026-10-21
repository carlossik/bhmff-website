import {test,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto'
const db=new PGlite({extensions:{pgcrypto}})
const uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`
const owner=uid(1),platform=uid(2),coach=uid(3),outsider=uid(4),org=uid(10),other=uid(11),team=uid(20),team2=uid(21),season=uid(30),player=uid(40),member=uid(41),fixture=uid(50),competition=uid(60)
await db.exec(`
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema extensions;create extension pgcrypto with schema extensions;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create table public.platform_admins(user_id uuid,active boolean);
create table public.organisations(id uuid primary key,name text,slug text,status text default 'active',organisation_type text default 'club',public_site_enabled boolean default true,subscription_plan text default 'professional',subscription_status text default 'active',trial_end timestamptz,max_users integer default 10,max_competitions integer default 10,enabled_modules text[] default array['Calendar'],updated_at timestamptz);
create table public.organisation_memberships(id uuid default gen_random_uuid(),organisation_id uuid,user_id uuid,role text,active boolean);
create table public.organisation_billing(organisation_id uuid,stripe_subscription_id text);
create table public.teams(id uuid primary key,organisation_id uuid,name text,age_group text,year_group integer,gender text,division text,logo_url text,published boolean default true,participation_status text default 'confirmed');
create table public.club_seasons(id uuid primary key,organisation_id uuid,name text,season_label text,start_date date,status text default 'active',created_at timestamptz default now());
create table public.club_players(id uuid primary key,organisation_id uuid,first_name text,last_name text,photo_url text);
create table public.club_squad_members(id uuid primary key,organisation_id uuid,season_id uuid,team_id uuid,player_id uuid,squad_number integer,position text,active boolean default true);
create table public.club_fixtures(id uuid primary key,organisation_id uuid,season_id uuid,team_id uuid,fixture_date date,kickoff_time time,home_away text,fixture_type text,venue_name text,status text default 'scheduled',published boolean default true,opponent_id uuid,created_at timestamptz default now());
create table public.club_opponents(id uuid primary key,organisation_id uuid,name text);
create table public.club_results(id uuid primary key,organisation_id uuid,season_id uuid,fixture_id uuid,home_score integer,away_score integer,player_of_the_match text,match_report text,published boolean default true);
create table public.club_goals(id uuid primary key,organisation_id uuid,season_id uuid,fixture_id uuid,player_name text,squad_member_id uuid,goal_type text);
create table public.competitions(id uuid primary key,organisation_id uuid,published boolean default true);
create table public.fixtures(id uuid primary key,competition_id uuid,published boolean default true);
create table public.goals(id uuid primary key,competition_id uuid,fixture_id uuid,team_id uuid,player_name text);
create table public.results(id uuid primary key,competition_id uuid,fixture_id uuid,home_score integer,away_score integer,player_of_match text,match_report text,published boolean default true);
alter table public.goals enable row level security;alter table public.results enable row level security;
create policy old_public_goals on public.goals for select to anon,authenticated using(true);
create policy old_public_results on public.results for select to anon,authenticated using(true);
create table public.communication_contacts(id uuid primary key,organisation_id uuid,team_id uuid,display_name text,active boolean default true,email text,whatsapp_e164 text,phone_e164 text,operational_email_enabled boolean default true,operational_whatsapp_enabled boolean default true);
grant usage on schema public,auth to anon,authenticated,service_role;
grant all on all tables in schema public to authenticated,service_role;
grant select on all tables in schema public to anon;
insert into auth.users values('${owner}','coach@example.test',now()),('${platform}','admin@example.test',now()),('${coach}','assistant@example.test',now()),('${outsider}','outsider@example.test',now());
insert into public.platform_admins values('${platform}',true);
insert into public.organisations(id,name,slug) values('${org}','Bexley Borough','bexley-borough'),('${other}','Another club','another');
insert into public.organisation_memberships(organisation_id,user_id,role,active) values('${org}','${owner}','super_admin',true),('${org}','${coach}','match_official',true),('${other}','${outsider}','super_admin',true);
insert into public.teams(id,organisation_id,name) values('${team}','${org}','U16'),('${team2}','${org}','U14');
insert into public.club_seasons(id,organisation_id,name,start_date) values('${season}','${org}','2026/27','2026-08-01');
insert into public.club_players values('${player}','${org}','Private','Child','https://example.test/photo.jpg');
insert into public.club_squad_members(id,organisation_id,season_id,team_id,player_id,squad_number) values('${member}','${org}','${season}','${team}','${player}',4);
insert into public.club_fixtures(id,organisation_id,season_id,team_id,fixture_date) values('${fixture}','${org}','${season}','${team}','2026-10-10');
insert into public.club_goals values('${uid(51)}','${org}','${season}','${fixture}','Private Child','${member}','player');
insert into public.club_results(id,organisation_id,season_id,fixture_id,home_score,away_score,player_of_the_match) values('${uid(52)}','${org}','${season}','${fixture}',2,1,'Private Child');
insert into public.competitions values('${competition}','${org}',true);
insert into public.fixtures values('${uid(61)}','${competition}',true);
insert into public.goals values('${uid(62)}','${competition}','${uid(61)}','${team}','Private Child');
insert into public.results values('${uid(63)}','${competition}','${uid(61)}',2,1,'Private Child','Private Child scored.',true);
`)
for(const name of ['20261008220000_public_player_privacy.sql','20261008220100_bexley_season_pilot.sql','20261008220200_club_calendar.sql']){
 await db.exec(await readFile(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'))
}
await db.exec('grant all on all tables in schema public to service_role;grant all on public.club_calendar_events,public.club_calendar_attendance,public.club_calendar_coaches to authenticated')
async function as(role,user=''){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);select set_config('request.jwt.claim.role','${role}',false);set role ${role}`)}
async function scalar(sql,params=[]){return (await db.query(sql,params)).rows[0]}

await test('public payloads redact names by default, and retain scores',async()=>{
 await as('anon');const raw=JSON.stringify((await scalar('select get_public_club_data($1) as payload',[org])).payload)
 assert(!raw.includes('Private Child'));assert(!raw.includes('photo.jpg'));assert(raw.includes('Player (name hidden)'))
 assert.equal((await scalar('select count(*)::integer n from goals')).n,0)
 assert.equal((await scalar('select count(*)::integer n from results')).n,0)
 const goal=await scalar('select player_name from public_goals');assert.equal(goal.player_name,'Player (name hidden)')
 const result=await scalar('select * from public_results');assert.equal(result.home_score,2);assert.equal(result.player_of_match,null);assert.equal(result.match_report,null)
})
await test('explicit checkbox opt-in releases the intended player name, and revocation hides it again',async()=>{
 await as('service_role');await db.query('update club_players set public_name_enabled=true where id=$1',[player]);await db.query('update goals set public_names_enabled=true');
 await as('anon');const data=(await scalar('select get_public_club_data($1) payload',[org])).payload;assert.equal(data.squad[0].playerName,'Private Child');assert.equal(data.goals[0].playerName,'Private Child');assert.equal((await scalar('select player_name from public_goals')).player_name,'Private Child')
 await as('service_role');await db.query('update club_players set public_name_enabled=false where id=$1',[player]);await db.query('update goals set public_names_enabled=false');
})
await test('pilot rejects unapproved email and ordinary-user approval; approved redemption is repeat-safe',async()=>{
 await as('authenticated',owner);await assert.rejects(()=>db.query('select approve_bexley_pilot_email($1)',['coach@example.test']),/Platform administrator/)
 await as('service_role');await assert.rejects(()=>db.query('select redeem_bexley_pilot($1,$2,$3)',[org,owner,'BEXLEY2027']),/approved Bexley/)
 await as('authenticated',platform);await db.query('select approve_bexley_pilot_email($1)',['coach@example.test'])
 await as('service_role');await db.query('select redeem_bexley_pilot($1,$2,$3)',[org,owner,'BEXLEY2027']);await db.query('select redeem_bexley_pilot($1,$2,$3)',[org,owner,'BEXLEY2027'])
 const result=await scalar('select subscription_plan,pilot_max_teams,pilot_expires_at from organisations where id=$1',[org]);assert.equal(result.subscription_plan,'professional');assert.equal(result.pilot_max_teams,3);assert.equal(new Date(result.pilot_expires_at).toISOString(),'2027-06-30T23:00:00.000Z')
 assert.equal((await scalar('select count(*)::integer n from organisation_billing')).n,0)
 await db.query('insert into teams(id,organisation_id,name) values($1,$2,$3)',[uid(22),org,'U12']);await assert.rejects(()=>db.query('insert into teams(id,organisation_id,name) values($1,$2,$3)',[uid(23),org,'Fourth']),/three teams/)
})
let eventId
await test('weekly recurrence preserves 18:00 London time across BST, and rejects cross-tenant teams',async()=>{
 await as('authenticated',owner)
 const args=[org,team,season,'Training','training','2026-10-18 18:00','2026-10-18 19:30','Europe/London','MFC Arena','','weekly','2026-11-01',1440,['email']]
 assert.equal((await scalar('select create_calendar_series($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) n',args)).n,3)
 const rows=(await db.query("select id,starts_at,extract(hour from starts_at at time zone 'Europe/London')::integer local_hour,extract(hour from starts_at at time zone 'UTC')::integer utc_hour from club_calendar_events order by starts_at")).rows;eventId=rows[0].id;assert(rows.every(r=>r.local_hour===18),JSON.stringify(rows));assert.equal(rows[0].utc_hour,17);assert.equal(rows[1].utc_hour,18)
 await assert.rejects(()=>db.query('select create_calendar_series($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',[other,...args.slice(1)]),/Calendar access required/)
})
await test('coach assignment limits reads and edits to assigned team',async()=>{
 await as('authenticated',coach);assert.equal((await scalar('select count(*)::integer n from club_calendar_events')).n,0)
 await as('authenticated',owner);await db.query('insert into club_calendar_coaches values($1,$2,$3)',[org,team,coach])
 await as('authenticated',coach);assert.equal((await scalar('select count(*)::integer n from club_calendar_events')).n,3)
 await db.query('update club_calendar_events set venue=$1 where id=$2',['Updated by coach',eventId]);assert.equal((await scalar('select venue from club_calendar_events where id=$1',[eventId])).venue,'Updated by coach')
 await assert.rejects(()=>db.query('insert into club_calendar_coaches values($1,$2,$3)',[org,team2,coach]),/row-level security/)
 await as('authenticated',outsider);assert.equal((await scalar('select count(*)::integer n from club_calendar_events')).n,0)
})
await test('reminder claims are deduplicated, respect opt-out, and private RSVP tokens cannot be guessed',async()=>{
 await as('authenticated',owner);await db.query("update club_calendar_events set starts_at=now()+interval '2 hours',ends_at=now()+interval '3 hours' where id=$1",[eventId])
 await as('service_role');await db.query('insert into communication_contacts(id,organisation_id,team_id,display_name,email) values($1,$2,$3,$4,$5)',[uid(70),org,team,'Parent','parent@example.test']);await db.query('insert into communication_contacts(id,organisation_id,team_id,display_name,email,operational_email_enabled) values($1,$2,$3,$4,$5,false)',[uid(71),org,team,'Opted out','out@example.test'])
 const claims=(await db.query('select * from claim_calendar_reminders(25)')).rows;assert.equal(claims.length,1);assert.equal(claims[0].token.length,64);assert.equal((await db.query('select * from claim_calendar_reminders(25)')).rows.length,0)
 await db.query("update club_calendar_reminders set status='accepted' where id=$1",[claims[0].job_id]);
 await as('anon');assert.equal((await scalar('select calendar_rsvp($1,null) payload',['0'.repeat(64)])).payload,null)
 const response=(await scalar('select calendar_rsvp($1,$2) payload',[claims[0].token,'yes'])).payload;assert.equal(response.response,'yes');assert(!JSON.stringify(response).includes('parent@example.test'));assert(!JSON.stringify(response).includes('Parent'))
 await as('authenticated',owner);await db.query("update club_calendar_events set status='cancelled' where id=$1",[eventId]);await as('anon');assert.equal((await scalar('select calendar_rsvp($1,null) payload',[claims[0].token])).payload,null)
})

await test('expired season pass blocks writes without waiting for a worker run',async()=>{
 await as('service_role');await db.query("update organisations set pilot_expires_at=now()-interval '1 second',subscription_status='trial' where id=$1",[org]);
 await assert.rejects(()=>db.query('insert into teams(id,organisation_id,name) values($1,$2,$3)',[uid(90),org,'After expiry']),/season pass has ended/);
 await as('authenticated',owner);assert.equal((await scalar('select count(*)::integer n from club_calendar_events')).n,0);
 await as('service_role');await db.query('select expire_season_pilots()');assert.equal((await scalar('select subscription_status from organisations where id=$1',[org])).subscription_status,'cancelled');
})
await db.close()
