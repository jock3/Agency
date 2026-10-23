-- Interna SEO/GEO-granskningar från /audit/intern. Egen tabell så att de inte
-- blandas med det publika verktygets körningar och leads i audit_runs.
--
-- Samma åtkomstmodell som audit_runs: RLS på, inga policyer, grants borttagna.
-- Läses och skrivs bara av servern med service-role-nyckeln.

create table if not exists public.audit_internal_runs (
  id          uuid primary key default gen_random_uuid(),
  -- Normaliserad start-URL. Historiken grupperas på värden.
  url         text not null,
  final_url   text not null,
  host        text not null,
  score       int  not null check (score between 1 and 10),
  seo_score   int  not null check (seo_score between 1 and 10),
  geo_score   int  not null check (geo_score between 1 and 10),
  checks      jsonb not null,
  actions     jsonb not null,
  pages       jsonb not null,
  -- Namnet på inloggad användare när körningen gjordes.
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_internal_runs_host_idx    on public.audit_internal_runs (host, created_at desc);
create index if not exists audit_internal_runs_created_idx on public.audit_internal_runs (created_at desc);

alter table public.audit_internal_runs enable row level security;

revoke all on public.audit_internal_runs from anon, authenticated;
