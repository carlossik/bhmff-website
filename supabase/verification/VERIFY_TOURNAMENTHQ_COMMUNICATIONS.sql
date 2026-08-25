-- TournamentHQ Communications Phase 4.1 verification
-- READ ONLY. Run after applying 20260821_tournamenthq_communications_foundation.sql.

-- 1) Core tables exist.
select
    to_regclass('public.communication_settings') as communication_settings,
    to_regclass('public.communication_contacts') as communication_contacts,
    to_regclass('public.communication_templates') as communication_templates,
    to_regclass('public.communication_messages') as communication_messages,
    to_regclass('public.communication_recipients') as communication_recipients,
    to_regclass('public.communication_deliveries') as communication_deliveries;

-- 2) System templates are seeded.
select
    code,
    name,
    category,
    message_class,
    active,
    system_defined,
    variables,
    provider_template_refs
from public.communication_templates
where organisation_id is null
order by category, code;

-- 3) RLS is enabled on every communications table.
select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
      'communication_settings',
      'communication_contacts',
      'communication_templates',
      'communication_messages',
      'communication_recipients',
      'communication_deliveries'
  )
order by c.relname;

-- 4) Policy audit. There should be no anon/public communications policies.
select
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename like 'communication_%'
order by tablename, policyname;

-- 5) Explicit check that anon has no policy on communications data.
select
    count(*) as anon_communications_policy_count
from pg_policies
where schemaname = 'public'
  and tablename like 'communication_%'
  and roles::text[] && array['anon','public']::text[];

-- Expected: 0.

-- 6) Finance ledger remains private and unchanged by this migration.
select
    to_regclass('public.club_player_charges') as club_player_charges,
    count(*) filter (where payment_status in ('due', 'part_paid')) as open_finance_obligations
from public.club_player_charges;

-- 7) Provider secrets must NOT be database columns.
select
    table_name,
    column_name
from information_schema.columns
where table_schema = 'public'
  and table_name like 'communication_%'
  and lower(column_name) ~ '(secret|token|api_key|auth_token|account_sid)'
order by table_name, column_name;

-- Expected: 0 rows.
