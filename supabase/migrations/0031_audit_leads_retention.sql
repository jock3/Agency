-- 0031 — Gallring av audit_leads (e-post från publika auditen).
--
-- Gustav beslutade 2026-11-26: adresserna sparas i 12 månader, sedan raderas
-- de automatiskt. pg_cron kör jobbet varje natt kl 03:15 UTC.

select cron.unschedule('audit_leads_retention')
where exists (select 1 from cron.job where jobname = 'audit_leads_retention');

select cron.schedule(
  'audit_leads_retention',
  '15 3 * * *',
  $$delete from public.audit_leads where created_at < now() - interval '12 months'$$
);
