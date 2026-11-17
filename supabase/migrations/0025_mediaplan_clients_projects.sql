-- Mediaplan i tre steg: kund → projekt → årsplaner och kampanjer.
--
-- mplan_clients och mplan_projects är nya (prefixet mp_ används redan av en
-- annan app i den delade databasen). En mediaplan kopplas till ett projekt och
-- är antingen projektets årsplan (en per år) eller en kampanj.
--
-- Kedjan kund → projekt → plan → rapport gör att statistik senare kan summeras
-- per nivå. report_docs får även en koppling till kampanjplaner (verktyget
-- Kampanj) för samma ändamål.
--
-- Bara tillägg. Tas en kund bort försvinner dess projekt, men planerna ligger
-- kvar utan projekt (Osorterade). Samma åtkomst som media_plans (0011): RLS på,
-- inga policyer, grants borttagna; all åtkomst går via serverfunktionerna.

create table if not exists public.mplan_clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) between 1 and 120),
  client_number text not null default '' check (length(client_number) <= 40),
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists mplan_clients_name_key on public.mplan_clients (lower(trim(name)));

create table if not exists public.mplan_projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.mplan_clients(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists mplan_projects_name_key on public.mplan_projects (client_id, lower(trim(name)));

alter table public.media_plans
  add column if not exists project_id uuid references public.mplan_projects(id) on delete set null,
  add column if not exists kind       text not null default 'campaign' check (kind in ('year', 'campaign')),
  add column if not exists plan_year  int check (plan_year between 2000 and 2100);

create index if not exists media_plans_project_idx on public.media_plans (project_id);
-- En årsplan per projekt och år.
create unique index if not exists media_plans_year_key on public.media_plans (project_id, plan_year) where kind = 'year' and project_id is not null;

alter table public.report_docs
  add column if not exists campaign_plan_id uuid references public.campaign_plans(id) on delete set null;

alter table public.mplan_clients  enable row level security;
alter table public.mplan_projects enable row level security;
revoke all on public.mplan_clients  from anon, authenticated;
revoke all on public.mplan_projects from anon, authenticated;
