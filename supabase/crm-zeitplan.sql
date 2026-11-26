-- =========================================================================
--  Solvera Akademie – nächtlicher CRM-Abgleich (Zeitplan)
--  -------------------------------------------------------------------------
--  Erst ausführen, wenn die Edge Function "crm-abgleich" läuft.
--  Vorher ersetzen:
--    PROJEKT   → die Projekt-Kennung, z. B. abcdefghijkl
--    GEHEIMNIS → derselbe Wert wie das Secret ABGLEICH_GEHEIMNIS
--  In der Edge Function muss „Verify JWT“ ausgeschaltet sein.
-- =========================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('crm-abgleich') where exists (select 1 from cron.job where jobname = 'crm-abgleich');

-- Jede Nacht um 2:15 Uhr (UTC, also 3:15 Uhr Winterzeit / 4:15 Uhr Sommerzeit)
select cron.schedule('crm-abgleich', '15 2 * * *', $$
  select net.http_post(
    url     := 'https://PROJEKT.supabase.co/functions/v1/crm-abgleich',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-geheimnis', 'GEHEIMNIS'),
    body    := '{"modus": "abgleich"}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
