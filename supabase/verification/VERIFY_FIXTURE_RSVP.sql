-- TournamentHQ Fixture RSVP MVP verification (READ ONLY)
-- Run after applying 20260825_club_fixture_rsvp.sql.

-- 1. Core RSVP tables.
select
    to_regclass('public.club_fixture_availability_requests') as requests,
    to_regclass('public.club_fixture_availability_recipients') as recipients,
    to_regclass('public.club_fixture_availability_tokens') as tokens;

-- 2. RLS enabled and forced on all RSVP tables.
select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
      'club_fixture_availability_requests',
      'club_fixture_availability_recipients',
      'club_fixture_availability_tokens'
  )
order by c.relname;

-- 3. No anonymous/public policies should expose RSVP rows or secure-token rows.
select
    tablename,
    policyname,
    roles,
    cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
      'club_fixture_availability_requests',
      'club_fixture_availability_recipients',
      'club_fixture_availability_tokens'
  )
order by tablename, policyname;

-- 4. Provider webhook helper exists and is service-role only.
select to_regprocedure(
    'public.apply_resend_fixture_rsvp_event(text,text,timestamptz,text)'
) as apply_resend_fixture_rsvp_event;

-- 5. Recent requests and response summary.
select
    r.id,
    r.fixture_id,
    r.team_id,
    r.status,
    r.sent_at,
    r.response_deadline,
    count(rec.id) as recipients,
    count(rec.id) filter (where rec.response = 'available') as available,
    count(rec.id) filter (where rec.response = 'unavailable') as unavailable,
    count(rec.id) filter (where rec.response = 'maybe') as maybe,
    count(rec.id) filter (
        where rec.response is null and rec.recipient_email is not null
    ) as awaiting,
    count(rec.id) filter (where rec.recipient_email is null) as missing_email
from public.club_fixture_availability_requests r
left join public.club_fixture_availability_recipients rec
  on rec.request_id = r.id
group by r.id
order by r.created_at desc
limit 20;

-- 6. Delivery lifecycle and responses.
select
    rec.player_name,
    rec.recipient_email,
    rec.delivery_status,
    rec.response,
    rec.responded_by_name,
    rec.responded_at,
    rec.sent_at,
    rec.delivered_at,
    rec.last_reminder_at,
    rec.status_detail
from public.club_fixture_availability_recipients rec
order by rec.created_at desc
limit 50;

-- 7. Raw secure tokens are never stored. Only hashes should exist.
select
    count(*) as token_rows,
    min(length(token_hash)) as minimum_hash_length,
    max(length(token_hash)) as maximum_hash_length
from public.club_fixture_availability_tokens;
-- Expected hash lengths: 64.
