-- Projekt i den interna SEO/GEO-auditen: en domän per projekt. Körningarna i
-- audit_internal_runs kopplas till sitt projekt.
--
-- Samma åtkomstmodell som audit_internal_runs: RLS på, inga policyer, grants
-- borttagna. Läses och skrivs bara av servern med service-role-nyckeln.

create table if not exists public.audit_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Värden utan "www.", en per projekt.
  domain      text not null unique,
  -- Normaliserad start-URL som granskas när någon trycker på Audit.
  url         text not null,
  created_by  text,
  created_at  timestamptz not null default now()
);

alter table public.audit_internal_runs
  add column if not exists project_id uuid references public.audit_projects(id) on delete cascade;

create index if not exists audit_internal_runs_project_idx on public.audit_internal_runs (project_id, created_at desc);

-- Körningar från före projekten får ett projekt per domän.
insert into public.audit_projects (name, domain, url, created_by, created_at)
select distinct on (d.domain) d.domain, d.domain, d.url, d.created_by, d.created_at
from (
  select regexp_replace(host, '^www\.', '') as domain, url, created_by, created_at
  from public.audit_internal_runs
) d
order by d.domain, d.created_at
on conflict (domain) do nothing;

update public.audit_internal_runs r
set project_id = p.id
from public.audit_projects p
where r.project_id is null and p.domain = regexp_replace(r.host, '^www\.', '');

alter table public.audit_projects enable row level security;

revoke all on public.audit_projects from anon, authenticated;
