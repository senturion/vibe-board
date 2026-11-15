-- Reminder schedule for Vibe Board.
--
-- Vercel's free plan runs a cron job once a day, so it cannot send a reminder
-- at a time you choose. This makes Supabase call the reminders endpoint every
-- 15 minutes instead; the endpoint decides who is due.
--
-- Run once in the Supabase SQL Editor after replacing the two placeholders:
--   YOUR-DOMAIN       the site's production domain, e.g. vibe-board.vercel.app
--   YOUR_CRON_SECRET  the same value as CRON_SECRET in Vercel
--
-- Do not commit a copy of this file with the real secret in it.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace any earlier copy of the job.
select cron.unschedule('vibe-board-reminders')
where exists (select 1 from cron.job where jobname = 'vibe-board-reminders');

select cron.schedule(
  'vibe-board-reminders',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR-DOMAIN/api/notifications/cron',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
  $$
);

-- To check it is running:  select * from cron.job_run_details order by start_time desc limit 5;
-- To remove it:            select cron.unschedule('vibe-board-reminders');
