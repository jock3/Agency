-- Rapport kopplad till mediaplan: en rapport kan skapas från en plan och ärver
-- då namn, period och taggar. Värdena kopieras när rapporten skapas.
--
-- En plan har högst en rapport (unikt index). Tas planen bort lever rapporten
-- kvar utan koppling. Inga nya behörigheter: tabellen är fortfarande låst för
-- anon och authenticated (0023).

alter table public.report_docs
  add column if not exists plan_id      uuid references public.media_plans(id) on delete set null,
  add column if not exists tags         text[] not null default '{}',
  add column if not exists period_start date,
  add column if not exists period_end   date;

create unique index if not exists report_docs_plan_key on public.report_docs (plan_id) where plan_id is not null;
