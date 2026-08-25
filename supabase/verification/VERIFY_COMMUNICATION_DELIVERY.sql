-- TournamentHQ Communications Phase 4.5 verification
-- READ ONLY. Run after applying 20260822_communications_delivery_tracking.sql.

-- 1. Delivery tracking columns exist.
select
    column_name,
    data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'communication_deliveries'
  and column_name in (
      'status_detail',
      'delayed_at',
      'bounced_at',
      'complained_at',
      'last_provider_event',
      'last_provider_event_at'
  )
order by column_name;

-- 2. Delivery status constraint includes the Phase 4.5 lifecycle.
select
    conname,
    pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.communication_deliveries'::regclass
  and conname = 'communication_deliveries_status_check';

-- 3. Private webhook event table and RLS state.
select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'communication_webhook_events';

-- 4. No anonymous/authenticated policies should exist on webhook audit data.
select
    count(*) as browser_webhook_policy_count
from pg_policies
where schemaname = 'public'
  and tablename = 'communication_webhook_events'
  and roles::text[] && array['anon','authenticated','public']::text[];
-- Expected: 0.

-- 5. Transactional Resend event function exists.
select
    to_regprocedure(
        'public.apply_resend_communication_event(text,text,text,timestamptz,text)'
    ) as apply_resend_communication_event;

-- 6. Recent delivery lifecycle. After a real email this should progress from
-- submitted/accepted to sent/delivered (or a failure state).
select
    d.id,
    r.recipient_name,
    d.channel,
    d.provider,
    d.status,
    d.provider_message_id,
    d.status_detail,
    d.queued_at,
    d.sent_at,
    d.delayed_at,
    d.delivered_at,
    d.read_at,
    d.bounced_at,
    d.complained_at,
    d.failed_at,
    d.last_provider_event,
    d.last_provider_event_at,
    d.updated_at
from public.communication_deliveries d
join public.communication_recipients r
  on r.id = d.recipient_id
order by d.queued_at desc
limit 25;

-- 7. Webhook audit events. Payload bodies are intentionally not stored.
select
    provider,
    event_id,
    event_type,
    provider_message_id,
    delivery_id,
    event_created_at,
    received_at,
    processed_at,
    outcome,
    detail
from public.communication_webhook_events
order by received_at desc
limit 25;
