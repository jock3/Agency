-- Tillgänglighetsgranskning (WCAG 2.2 AA) i /tillganglighet. Egna projekt
-- och körningar, skilda från SEO/GEO-auditen.
--
-- Samma åtkomstmodell som auditen: RLS på, inga policyer, grants borttagna.
-- Läses och skrivs bara av servern med service-role-nyckeln.

create table if not exists public.a11y_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Värden utan "www.", en per projekt.
  domain      text not null unique,
  -- Normaliserad start-URL som granskas.
  url         text not null,
  created_by  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.a11y_runs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.a11y_projects(id) on delete cascade,
  url         text not null,
  final_url   text not null,
  host        text not null,
  score       int  not null check (score between 1 and 10),
  -- Brister per regel, sammanvägda över sidorna.
  findings    jsonb not null,
  -- Regler där axe-core inte kunde avgöra själv och en människa måste titta.
  manual      jsonb not null,
  pages       jsonb not null,
  passes      int  not null default 0,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists a11y_runs_project_idx on public.a11y_runs (project_id, created_at desc);

alter table public.a11y_projects enable row level security;
alter table public.a11y_runs enable row level security;

revoke all on public.a11y_projects from anon, authenticated;
revoke all on public.a11y_runs from anon, authenticated;
