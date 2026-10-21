-- SEO/GEO-audit: publikt säljverktyg. Besökaren anger en webbplats, får ett
-- betyg 1–10 direkt och lämnar e-post för att låsa upp 3–5 åtgärdspunkter.
--
-- Samma åtkomstmodell som formatkoll och todo: RLS på, inga policyer, grants
-- borttagna. Den publika sidan pratar bara med /api/public/audit/*, som skriver
-- med service-role-nyckeln. Leads innehåller personuppgifter och får aldrig nås
-- med anon-nyckeln som ligger i webbläsaren.

create extension if not exists "pgcrypto";

create table if not exists public.audit_runs (
  id          uuid primary key default gen_random_uuid(),
  -- Normaliserad start-URL (schema + värd + sökväg, utan fragment). Används för
  -- att återanvända en färsk körning i stället för att hämta sidan igen.
  url         text not null,
  final_url   text not null,
  host        text not null,
  score       int  not null check (score between 1 and 10),
  seo_score   int  not null check (seo_score between 1 and 10),
  geo_score   int  not null check (geo_score between 1 and 10),
  checks      jsonb not null,
  -- Sidutdrag som skickas till Claude när åtgärderna genereras. Sparas så att
  -- upplåsningen inte behöver hämta sidan en gång till.
  extract     jsonb not null,
  -- Fylls först vid upplåsning. Claude anropas bara för besökare som lämnat
  -- e-post, så kostnaden följer antalet leads, inte antalet körningar.
  summary     text,
  actions     jsonb,
  -- sha256(ip + hemlighet). Räcker för hastighetsbegränsning, går inte att
  -- vända tillbaka till en adress.
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.audit_leads (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.audit_runs(id) on delete cascade,
  email       text not null,
  consent     boolean not null,
  created_at  timestamptz not null default now()
);

create index if not exists audit_runs_url_idx     on public.audit_runs (url, created_at desc);
create index if not exists audit_runs_ip_idx      on public.audit_runs (ip_hash, created_at desc);
create index if not exists audit_runs_created_idx on public.audit_runs (created_at desc);
create index if not exists audit_leads_run_idx    on public.audit_leads (run_id);

alter table public.audit_runs  enable row level security;
alter table public.audit_leads enable row level security;

revoke all on public.audit_runs  from anon, authenticated;
revoke all on public.audit_leads from anon, authenticated;
