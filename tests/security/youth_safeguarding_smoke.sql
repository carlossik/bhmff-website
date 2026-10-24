-- TournamentHQ Phase 2: public club safeguarding integration tests.
-- Staging-only disposable database. No production access or credentials.
-- Validates the final 20261012 team-level names toggle, not an outdated RPC.
-- Synthetic records and all changes are rolled back.
\set ON_ERROR_STOP on
BEGIN;

-- Two published teams in one public club. The youth team starts private;
-- the adult team is explicitly opted in by the synthetic administrator.
INSERT INTO public.organisations
  (id, name, slug, status, organisation_type, public_site_enabled)
VALUES
  ('e0000000-0000-4000-8000-000000000001', 'CI Safeguarding Club', 'ci-safeguarding-club',
   'active', 'club', true);

INSERT INTO public.club_seasons
  (id, organisation_id, name, season_label, status, start_date)
VALUES
  ('e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000001',
   'CI Safeguarding 2026', 'CI Safeguarding 2026', 'active', DATE '2026-09-01');

INSERT INTO public.teams
  (id, organisation_id, name, age_group, published, participation_status, show_public_player_names)
VALUES
  ('e0000000-0000-4000-8000-000000000011',
   'e0000000-0000-4000-8000-000000000001', 'CI Youth U15', 'U15', true, 'confirmed', false),
  ('e0000000-0000-4000-8000-000000000012',
   'e0000000-0000-4000-8000-000000000001', 'CI Adult Team', 'Adults', true, 'confirmed', true);

INSERT INTO public.club_team_seasons
  (organisation_id, season_id, team_id, status)
VALUES
  ('e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000011', 'active'),
  ('e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000012', 'active');

-- The individual visibility flag is intentionally enabled for the minor.
-- It must NOT override the more restrictive team-level opt-in.
INSERT INTO public.club_players
  (id, organisation_id, first_name, last_name, photo_url, public_name_enabled)
VALUES
  ('e0000000-0000-4000-8000-000000000021',
   'e0000000-0000-4000-8000-000000000001',
   'CIPrivateYouth', 'Example', 'https://example.invalid/ci-youth-photo.jpg', true),
  ('e0000000-0000-4000-8000-000000000022',
   'e0000000-0000-4000-8000-000000000001',
   'CIPublicAdult', 'Example', 'https://example.invalid/ci-adult-photo.jpg', true);

INSERT INTO public.club_squad_members
  (id, organisation_id, season_id, team_id, player_id, registration_status, active)
VALUES
  ('e0000000-0000-4000-8000-000000000031',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000011',
   'e0000000-0000-4000-8000-000000000021', 'registered', true),
  ('e0000000-0000-4000-8000-000000000032',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000012',
   'e0000000-0000-4000-8000-000000000022', 'registered', true);

INSERT INTO public.club_fixtures
  (id, organisation_id, season_id, team_id, fixture_date, status, published)
VALUES
  ('e0000000-0000-4000-8000-000000000041',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000011', DATE '2026-10-17', 'played', true),
  ('e0000000-0000-4000-8000-000000000042',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000012', DATE '2026-10-18', 'played', true);

INSERT INTO public.club_results
  (id, organisation_id, season_id, fixture_id, home_score, away_score,
   player_of_match, published)
VALUES
  ('e0000000-0000-4000-8000-000000000051',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000041', 2, 0, 'CIPrivateYouth Example', true),
  ('e0000000-0000-4000-8000-000000000052',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000042', 2, 0, 'CIPublicAdult Example', true);

INSERT INTO public.club_goals
  (id, organisation_id, season_id, fixture_id, player_id, squad_member_id,
   player_name, goal_type, minute)
VALUES
  ('e0000000-0000-4000-8000-000000000061',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000041',
   'e0000000-0000-4000-8000-000000000021',
   'e0000000-0000-4000-8000-000000000031', 'CIPrivateYouth Example', 'player', 10),
  ('e0000000-0000-4000-8000-000000000062',
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000042',
   'e0000000-0000-4000-8000-000000000022',
   'e0000000-0000-4000-8000-000000000032', 'CIPublicAdult Example', 'player', 15);

-- Use the anonymous database role (rather than service_role/postgres),
-- exercising the actual public RPC boundary and its SECURITY DEFINER logic.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role', 'anon', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

DO $$
DECLARE
  v jsonb;
  young_squad jsonb;
  adult_squad jsonb;
  young_goal jsonb;
  adult_goal jsonb;
  young_result jsonb;
  adult_result jsonb;
BEGIN
  IF current_user <> 'anon' THEN
    RAISE EXCEPTION 'FAIL [safeguarding-auth] not executing as anon';
  END IF;
  v := public.get_public_club_data('e0000000-0000-4000-8000-000000000001');
  IF v IS NULL THEN
    RAISE EXCEPTION 'FAIL [public-club-rpc] enabled public club unexpectedly invisible';
  END IF;
  SELECT x INTO young_squad FROM jsonb_array_elements(v->'squad') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000031';
  SELECT x INTO adult_squad FROM jsonb_array_elements(v->'squad') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000032';
  SELECT x INTO young_goal FROM jsonb_array_elements(v->'goals') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000061';
  SELECT x INTO adult_goal FROM jsonb_array_elements(v->'goals') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000062';
  SELECT x INTO young_result FROM jsonb_array_elements(v->'results') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000051';
  SELECT x INTO adult_result FROM jsonb_array_elements(v->'results') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000052';

  IF young_squad IS NULL OR young_goal IS NULL OR young_result IS NULL
     OR adult_squad IS NULL OR adult_goal IS NULL OR adult_result IS NULL THEN
    RAISE EXCEPTION 'FAIL [public-payload] missing expected published squad/goal/result records';
  END IF;
  IF young_squad->>'playerName' IS DISTINCT FROM 'Player (name hidden)'
     OR young_squad->>'photoUrl' IS NOT NULL
     OR young_goal->>'playerName' IS DISTINCT FROM 'Player (name hidden)'
     OR young_goal->>'squadMemberId' IS NOT NULL
     OR young_result->>'playerOfTheMatch' IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL [youth-hidden] youth name, portrait, scorer link or award leaked';
  END IF;
  -- No hidden names should survive as incidental strings anywhere in the JSON.
  IF v::text LIKE '%CIPrivateYouth%' OR v::text LIKE '%ci-youth-photo%' THEN
    RAISE EXCEPTION 'FAIL [youth-payload-leak] identifying data remains in public JSON';
  END IF;
  RAISE NOTICE 'PASS [youth-hidden] published U15 names, photo, goal and award redacted';

  IF adult_squad->>'playerName' IS DISTINCT FROM 'CIPublicAdult Example'
     OR adult_squad->>'photoUrl' IS DISTINCT FROM 'https://example.invalid/ci-adult-photo.jpg'
     OR adult_goal->>'playerName' IS DISTINCT FROM 'CIPublicAdult Example'
     OR adult_result->>'playerOfTheMatch' IS DISTINCT FROM 'CIPublicAdult Example' THEN
    RAISE EXCEPTION 'FAIL [adult-visible] explicitly enabled adult team missing permitted details';
  END IF;
  RAISE NOTICE 'PASS [adult-visible] adult team with opt-in exposes intended public details';
END $$;

-- Enable youth names exactly as a club administrator would, then verify the
-- publicly returned JSON switches; no client-side-only redaction is involved.
RESET ROLE;
UPDATE public.teams
SET show_public_player_names = true
WHERE id = 'e0000000-0000-4000-8000-000000000011';
SET LOCAL ROLE anon;
DO $$
DECLARE
  v jsonb;
  s jsonb;
  g jsonb;
  r jsonb;
BEGIN
  v := public.get_public_club_data('e0000000-0000-4000-8000-000000000001');
  SELECT x INTO s FROM jsonb_array_elements(v->'squad') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000031';
  SELECT x INTO g FROM jsonb_array_elements(v->'goals') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000061';
  SELECT x INTO r FROM jsonb_array_elements(v->'results') x
    WHERE x->>'id' = 'e0000000-0000-4000-8000-000000000051';
  IF s IS NULL OR g IS NULL OR r IS NULL
     OR s->>'playerName' IS DISTINCT FROM 'CIPrivateYouth Example'
     OR s->>'photoUrl' IS DISTINCT FROM 'https://example.invalid/ci-youth-photo.jpg'
     OR g->>'playerName' IS DISTINCT FROM 'CIPrivateYouth Example'
     OR g->>'squadMemberId' IS DISTINCT FROM 'e0000000-0000-4000-8000-000000000031'
     OR r->>'playerOfTheMatch' IS DISTINCT FROM 'CIPrivateYouth Example' THEN
    RAISE EXCEPTION 'FAIL [team-opt-in] youth details not displayed after explicit toggle';
  END IF;
  RAISE NOTICE 'PASS [team-opt-in] explicit team setting controls public identity data';
END $$;

RESET ROLE;
UPDATE public.teams
SET show_public_player_names = false
WHERE id = 'e0000000-0000-4000-8000-000000000011';
SET LOCAL ROLE anon;
DO $$
DECLARE
  v jsonb;
BEGIN
  v := public.get_public_club_data('e0000000-0000-4000-8000-000000000001');
  IF v::text LIKE '%CIPrivateYouth%' OR v::text LIKE '%ci-youth-photo%' THEN
    RAISE EXCEPTION 'FAIL [team-opt-out] youth names or portrait remain after toggle off';
  END IF;
  RAISE NOTICE 'PASS [team-opt-out] youth identities hidden again after disabling public names';
END $$;

RESET ROLE;
ROLLBACK;
\echo 'PASS: TournamentHQ youth safeguarding public-data tests completed'
