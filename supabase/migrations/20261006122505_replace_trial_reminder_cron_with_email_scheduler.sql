-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces the old daily "trial-reminder" cron job (which only covered the
-- no-card free trial, once a day) with the new hourly "email-scheduler"
-- (which covers the RevenueCat trial sequence day 0/1/3/5/6 and the
-- "we miss you" email, and runs hourly so UK quiet-hours postponement
-- actually lands at 09:00 rather than a full day late).
--
-- The trial-reminder edge function itself has been deleted
-- (supabase/functions/trial-reminder/) — this is a straight replacement,
-- not an addition, per the brief not to run two systems doing the same job.
--
-- The anon key below is the project's public anon key (safe to embed in
-- cron.job — it's the same key already shipped in the app bundle).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.unschedule('trial-reminder-daily');

SELECT cron.schedule(
  'email-scheduler-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://giprbmoteojghxzodpcw.supabase.co/functions/v1/email-scheduler',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcHJibW90ZW9qZ2h4em9kcGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTI3MzIsImV4cCI6MjA5MjM4ODczMn0.xVMj_94fam8XcZLwQHsgIg1Hatlb_LDA3ex4jh-z5OI", "Content-Type": "application/json"}'::jsonb
  )
  $$
);
