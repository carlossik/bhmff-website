-- TournamentHQ Phase 1: PostgreSQL RLS/authorisation integration smoke tests.
-- CI ONLY: invoked in disposable local Supabase on GitHub's staging runner.
-- Tests query as database roles `authenticated`/`anon` with synthetic JWT claims.
-- No service_role keys or live network access; all writes are rolled back.
-- Missing baseline table grants are reported before temporary CI-only grants;
-- policy/function failures and unexpected rows still fail the test.

\set ON_ERROR_STOP on
BEGIN;

-- The database is rebuilt on every run. These deterministic identifiers are
-- test-only; the synthetic email addresses are reserved example.invalid values.
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
    ('f0000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thq-ci-admin-a@example.invalid', null, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    ('f0000000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thq-ci-official-a@example.invalid', null, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    ('f0000000-0000-4000-8000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thq-ci-admin-b@example.invalid', null, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

-- Some application migrations provision a profile through an auth trigger.
-- Upsert for compatibility, not to disable that trigger.
INSERT INTO public.profiles (id, full_name, role, active, email) VALUES
    ('f0000000-0000-4000-8000-000000000101', 'CI Admin A', 'super_admin', true, 'thq-ci-admin-a@example.invalid'),
    ('f0000000-0000-4000-8000-000000000102', 'CI Official A', 'match_official', true, 'thq-ci-official-a@example.invalid'),
    ('f0000000-0000-4000-8000-000000000103', 'CI Admin B', 'super_admin', true, 'thq-ci-admin-b@example.invalid')
ON CONFLICT (id) DO UPDATE
SET role = excluded.role, active = excluded.active, full_name = excluded.full_name;

INSERT INTO public.organisations (id, name, slug, status, organisation_type, public_site_enabled) VALUES
    ('f0000000-0000-4000-8000-000000000201', 'CI Private Club A', 'ci-rls-club-a', 'active', 'club', false),
    ('f0000000-0000-4000-8000-000000000202', 'CI Private Club B', 'ci-rls-club-b', 'active', 'club', false);

INSERT INTO public.organisation_memberships (organisation_id, user_id, role, active) VALUES
    ('f0000000-0000-4000-8000-000000000201', 'f0000000-0000-4000-8000-000000000101', 'super_admin', true),
    ('f0000000-0000-4000-8000-000000000201', 'f0000000-0000-4000-8000-000000000102', 'match_official', true),
    ('f0000000-0000-4000-8000-000000000202', 'f0000000-0000-4000-8000-000000000103', 'super_admin', true);

-- Private, unpublished competitions: public listing policies must not expose
-- these records. They also exercise the fixture-management permission RPC.
INSERT INTO public.competitions (id, organisation_id, name, slug, format, status, published) VALUES
    ('f0000000-0000-4000-8000-000000000301', 'f0000000-0000-4000-8000-000000000201', 'CI Competition A', 'ci-rls-comp-a', 'LEAGUE', 'DRAFT', false),
    ('f0000000-0000-4000-8000-000000000302', 'f0000000-0000-4000-8000-000000000202', 'CI Competition B', 'ci-rls-comp-b', 'LEAGUE', 'DRAFT', false);

-- Deliberately sensitive finance rows: private guardian/payer details must
-- never leak to unrelated clubs or ordinary match officials.
INSERT INTO public.club_finance_payers (id, organisation_id, payer_type, full_name) VALUES
    ('f0000000-0000-4000-8000-000000000401', 'f0000000-0000-4000-8000-000000000201', 'guardian', 'CI Private Payer A'),
    ('f0000000-0000-4000-8000-000000000402', 'f0000000-0000-4000-8000-000000000202', 'guardian', 'CI Private Payer B');

DO $$
DECLARE missing_rls text;
BEGIN
  SELECT string_agg(t.n, ', ')
  INTO missing_rls
  FROM (VALUES ('public.organisations'), ('public.organisation_memberships'),
               ('public.competitions'), ('public.club_finance_payers'),
               ('public.club_finance_access'), ('public.club_players')) AS t(n)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.oid = to_regclass(t.n) AND c.relrowsecurity = true
  );
  IF missing_rls IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL [RLS-enabled] missing RLS: %', missing_rls;
  END IF;
  RAISE NOTICE 'PASS [RLS-enabled] organisation, competition, player and finance tables';
END $$;

-- PRIVILEGE AUDIT (performed BEFORE harness-only grants):
-- Reconstructed historical migrations may predate Supabase's stricter default
-- grants. Capture the gaps rather than quietly treating them as valid.
-- This is a real privilege audit, not an RLS policy check; a missing GRANT can
-- break intended application reads even when a correct RLS policy exists.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.organisations',
    'public.competitions',
    'public.club_finance_payers'
  ] LOOP
    IF NOT has_table_privilege('authenticated', table_name, 'SELECT') THEN
      RAISE WARNING 'BASELINE GRANT GAP: authenticated lacks SELECT on %. Temporary CI grant will test RLS independently; production grants still require review.', table_name;
    ELSE
      RAISE NOTICE 'BASELINE GRANT OK: authenticated has SELECT on %', table_name;
    END IF;
  END LOOP;
END $$;

-- RLS POLICY TEST HARNESS, NOT A PRODUCTION SCHEMA FIX.
-- Minimum SELECT privileges for the three tables queried by this particular
-- smoke suite. GRANT on a table does NOT bypass its row-level security policy.
-- GRANTs are inside BEGIN / ROLLBACK and never persist beyond this smoke test.
-- Do not use GRANT ALL, ALTER TABLE DISABLE ROW LEVEL SECURITY, or service_role.
GRANT SELECT ON TABLE
    public.organisations,
    public.competitions,
    public.club_finance_payers
TO authenticated;

-- Guardrails: real RLS still enabled and the test role has expected table
-- privileges before switching to authenticated. This cannot prove that the
-- original migrations provision all necessary privileges in production.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.organisations',
    'public.competitions',
    'public.club_finance_payers'
  ] LOOP
    IF NOT has_table_privilege('authenticated', table_name, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL [CI grant setup] authenticated cannot SELECT %', table_name;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = table_name::regclass) THEN
      RAISE EXCEPTION 'FAIL [RLS setup] RLS disabled on %', table_name;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS [RLS grant setup] SELECT privileges present; RLS remains enabled';
END $$;

-- Test using the real authenticated database role; postgres / service_role
-- would bypass RLS and therefore give false-positive test results.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000101', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000101"}', true);
DO $$
BEGIN
  IF auth.uid() IS DISTINCT FROM 'f0000000-0000-4000-8000-000000000101'::uuid THEN
    RAISE EXCEPTION 'FAIL [JWT-simulation] auth.uid() does not match synthetic user A';
  END IF;
  IF (SELECT count(*) FROM public.competitions WHERE id IN
      ('f0000000-0000-4000-8000-000000000301', 'f0000000-0000-4000-8000-000000000302')) <> 1
     OR NOT EXISTS(SELECT 1 FROM public.competitions WHERE id = 'f0000000-0000-4000-8000-000000000301') THEN
    RAISE EXCEPTION 'FAIL [competition-tenant-isolation] admin A can see wrong private competitions';
  END IF;
  RAISE NOTICE 'PASS [competition-tenant-isolation] admin A sees only private competition A';
  IF public.can_manage_competition_fixture('f0000000-0000-4000-8000-000000000301') IS DISTINCT FROM true
     OR public.can_manage_competition_fixture('f0000000-0000-4000-8000-000000000302') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL [fixture-management] admin A management scope is incorrect';
  END IF;
  RAISE NOTICE 'PASS [fixture-management] admin A can manage only competition A';
  IF public.club_finance_has_full_access('f0000000-0000-4000-8000-000000000201') IS DISTINCT FROM true
     OR public.club_finance_has_full_access('f0000000-0000-4000-8000-000000000202') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL [finance-roles] admin A finance scope is incorrect';
  END IF;
  IF (SELECT count(*) FROM public.club_finance_payers WHERE id IN
     ('f0000000-0000-4000-8000-000000000401', 'f0000000-0000-4000-8000-000000000402')) <> 1
     OR NOT EXISTS(SELECT 1 FROM public.club_finance_payers WHERE id = 'f0000000-0000-4000-8000-000000000401') THEN
    RAISE EXCEPTION 'FAIL [finance-row-isolation] admin A can see wrong private payers';
  END IF;
  RAISE NOTICE 'PASS [finance-isolation] admin A sees private payer A but not B';
END $$;

-- Ordinary official: membership gives access to competition A, not rights to
-- manage its fixtures or to view sensitive club finance records.
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000102', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000102"}', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.competitions WHERE id IN
      ('f0000000-0000-4000-8000-000000000301', 'f0000000-0000-4000-8000-000000000302')) <> 1
     OR NOT EXISTS(SELECT 1 FROM public.competitions WHERE id = 'f0000000-0000-4000-8000-000000000301') THEN
    RAISE EXCEPTION 'FAIL [official-membership] official A cannot see only private competition A';
  END IF;
  IF public.can_manage_competition_fixture('f0000000-0000-4000-8000-000000000301') IS DISTINCT FROM false
     OR public.can_manage_competition_fixture('f0000000-0000-4000-8000-000000000302') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL [fixture-permissions] match official has admin-level fixture access';
  END IF;
  RAISE NOTICE 'PASS [fixture-permissions] ordinary official cannot manage fixtures';
  IF public.club_finance_has_full_access('f0000000-0000-4000-8000-000000000201') IS DISTINCT FROM false
     OR EXISTS(SELECT 1 FROM public.club_finance_payers WHERE organisation_id IN
       ('f0000000-0000-4000-8000-000000000201', 'f0000000-0000-4000-8000-000000000202')) THEN
    RAISE EXCEPTION 'FAIL [finance-least-privilege] match official sees private finance data';
  END IF;
  RAISE NOTICE 'PASS [finance-least-privilege] ordinary official cannot read payers';
END $$;

-- A different organisation's administrator must not gain cross-tenant access.
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000103', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000103"}', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.competitions WHERE id IN
      ('f0000000-0000-4000-8000-000000000301', 'f0000000-0000-4000-8000-000000000302')) <> 1
     OR NOT EXISTS(SELECT 1 FROM public.competitions WHERE id = 'f0000000-0000-4000-8000-000000000302') THEN
    RAISE EXCEPTION 'FAIL [reverse-tenant-isolation] admin B can see wrong private competitions';
  END IF;
  IF public.can_manage_competition_fixture('f0000000-0000-4000-8000-000000000301') IS DISTINCT FROM false
     OR public.can_manage_competition_fixture('f0000000-0000-4000-8000-000000000302') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL [reverse-fixture-permissions] admin B can manage wrong fixtures';
  END IF;
  IF (SELECT count(*) FROM public.club_finance_payers WHERE id IN
      ('f0000000-0000-4000-8000-000000000401', 'f0000000-0000-4000-8000-000000000402')) <> 1
     OR NOT EXISTS(SELECT 1 FROM public.club_finance_payers WHERE id = 'f0000000-0000-4000-8000-000000000402') THEN
    RAISE EXCEPTION 'FAIL [reverse-finance-isolation] admin B can see wrong private payers';
  END IF;
  RAISE NOTICE 'PASS [reverse-tenant-isolation] admin B sees only B competitions and finance';
END $$;

-- A JWT claiming an unknown user has no membership in either organisation.
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000199', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"f0000000-0000-4000-8000-000000000199"}', true);
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.competitions WHERE id IN
     ('f0000000-0000-4000-8000-000000000301', 'f0000000-0000-4000-8000-000000000302'))
    OR EXISTS(SELECT 1 FROM public.club_finance_payers WHERE organisation_id IN
     ('f0000000-0000-4000-8000-000000000201', 'f0000000-0000-4000-8000-000000000202'))
    OR public.can_manage_competition_fixture('f0000000-0000-4000-8000-000000000301') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL [outsider] unknown user can see private data or manage fixtures';
  END IF;
  RAISE NOTICE 'PASS [outsider] no private competition, finance or fixture management';
END $$;

-- A disabled public club site must not leak its JSON payload to anonymous users.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role', 'anon', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$
BEGIN
  IF public.get_public_club_data('f0000000-0000-4000-8000-000000000201') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL [public-site-privacy] unpublished club disclosed public JSON';
  END IF;
  RAISE NOTICE 'PASS [public-site-privacy] disabled club site returns NULL';
END $$;

-- Postgres is disposable, but rolling back ensures even a persistent DB would
-- contain no synthetic users, memberships, organisations or finance rows.
RESET ROLE;
ROLLBACK;
\echo 'PASS: TournamentHQ first-phase RLS and tenant-isolation tests completed'
