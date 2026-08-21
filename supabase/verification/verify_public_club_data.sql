-- TournamentHQ public club data verification (READ ONLY)
-- Replace the slug if testing a different club.

-- 1. Resolve the public club.
select
    id,
    name,
    slug,
    status,
    public_site_enabled
from public.organisations
where slug = 'pettswood-vets1';

-- 2. Confirm the RPC exists and has the intended execution grants.
select
    p.oid::regprocedure as function_name,
    p.prosecdef as security_definer,
    p.provolatile as volatility,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
    p.proacl as explicit_acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_public_club_data';

-- 3. Inspect the returned safe public payload using the PettsWood organisation.
select public.get_public_club_data(o.id)
from public.organisations o
where o.slug = 'pettswood-vets1';

-- 4. Current RLS policies relevant to the old browser-direct implementation.
-- These can remain restrictive because the public website now uses the safe RPC.
select
    tablename,
    policyname,
    roles,
    cmd,
    qual
from pg_policies
where schemaname = 'public'
  and tablename in (
      'club_seasons',
      'club_fixtures',
      'club_opponents',
      'club_squad_members',
      'club_players',
      'club_results',
      'club_goals'
  )
order by tablename, policyname;
