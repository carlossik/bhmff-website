-- Run only when you are ready to activate scheduled reminders.
-- Prerequisites: enable Supabase Cron (pg_cron), pg_net and Vault in the target project.
-- Create two Vault secrets in the dashboard before running this:
--   thq_calendar_worker_url: https://YOUR_PROJECT.supabase.co/functions/v1/calendar-reminders
--   thq_calendar_worker_secret: the SAME random value as THQ_CALENDAR_WORKER_SECRET
-- The worker secret must not be an anon key or a service-role key.
-- Every five minutes; at most 25 jobs per worker invocation, with duplicate claims prevented in SQL.
select cron.schedule(
 'thq-calendar-reminders',
 '*/5 * * * *',
 $job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='thq_calendar_worker_url' limit 1),
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='thq_calendar_worker_secret' limit 1)
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
 );
 $job$
);
-- To disable scheduling later: select cron.unschedule('thq-calendar-reminders');
