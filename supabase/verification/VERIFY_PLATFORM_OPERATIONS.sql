-- TournamentHQ Platform Operations restoration verification
-- READ ONLY. Safe to run after applying/deploying the restoration pack.

-- 1. Private operations telemetry exists.
select to_regclass('public.platform_operations_events') as platform_operations_events;

-- 2. Required billing diagnostic columns exist.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'organisation_billing'
  and column_name in (
      'stripe_livemode',
      'last_stripe_event_id',
      'last_stripe_event_at'
  )
order by column_name;

-- 3. Platform telemetry must remain browser-private.
select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'platform_operations_events';

select count(*) as browser_policy_count
from pg_policies
where schemaname = 'public'
  and tablename = 'platform_operations_events'
  and roles::text[] && array['anon','authenticated','public']::text[];
-- Expected: 0.

-- 4. Confirm platform administrators still exist.
select user_id, active, created_at, updated_at
from public.platform_admins
where active = true
order by updated_at desc;

-- 5. Current customer/subscription state.
select
    o.id,
    o.name,
    o.organisation_type,
    o.subscription_plan,
    o.subscription_status,
    o.trial_end,
    ob.stripe_status,
    ob.billing_interval,
    ob.stripe_price_id,
    ob.stripe_livemode,
    ob.cancel_at_period_end,
    ob.last_stripe_event_id,
    ob.last_stripe_event_at,
    ob.updated_at
from public.organisations o
left join public.organisation_billing ob
  on ob.organisation_id = o.id
order by o.updated_at desc;

-- 6. Latest production events and failures.
select
    poe.occurred_at,
    poe.severity,
    poe.processing_status,
    poe.source,
    poe.category,
    poe.event_type,
    o.name as organisation_name,
    poe.message,
    poe.correlation_id,
    poe.external_id,
    poe.duration_ms
from public.platform_operations_events poe
left join public.organisations o
  on o.id = poe.organisation_id
order by poe.occurred_at desc
limit 100;

-- 7. Attention-worthy events only.
select
    poe.occurred_at,
    poe.severity,
    poe.processing_status,
    poe.source,
    poe.event_type,
    o.name as organisation_name,
    poe.message
from public.platform_operations_events poe
left join public.organisations o
  on o.id = poe.organisation_id
where poe.severity in ('warning','error','critical')
   or poe.processing_status = 'failed'
order by poe.occurred_at desc
limit 100;
