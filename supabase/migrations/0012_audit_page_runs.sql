-- Granskningar av enskilda sidor i ett audit-projekt. En rad per körning, så
-- att historiken per sida kan visas. Samma åtkomstmodell som audit_internal_runs:
-- RLS på, inga policyer, grants borttagna. Bara servern läser och skriver.

create table if not exists public.audit_page_runs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.audit_projects(id) on delete cascade,
  url         text not null,
  title       text not null default '',
  status      int  not null,
  seo_score   int  not null check (seo_score between 1 and 10),
  geo_score   int  not null check (geo_score between 1 and 10),
  checks      jsonb not null,
  actions     jsonb not null,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_page_runs_lookup_idx on public.audit_page_runs (project_id, url, created_at desc);

alter table public.audit_page_runs enable row level security;

revoke all on public.audit_page_runs from anon, authenticated;
