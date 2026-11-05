-- Annonsverktyget (Social media → Annonsverktyg), steg 1: företag och medlemskap.
--
-- Ett företag är en kund eller ett varumärke som annonser byggs för. All
-- annonsdata i senare steg bär company_id, och en användare ser bara de
-- företag hon är medlem i.
--
-- Åtkomstmodellen är densamma som formatkoll och auditen, eftersom appen inte
-- kör Supabase Auth (inloggning sker med app_login/app_sessions): RLS på, inga
-- policyer, grants borttagna för anon och authenticated. Policyer riktade mot
-- `authenticated` vore verkningslösa här. All åtkomst går via /api/annonser/*
-- och serversidor, som validerar sessionskakan, kontrollerar medlemskapet i
-- ad_company_members och sedan använder service-role-nyckeln. Isoleringen
-- mellan företag avgörs alltså av medlemskapskontrollen i lib/ads/access.ts.
--
-- Tabellerna har prefixet ad_ eftersom databasen delas med övriga appar.

create table if not exists public.ad_companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 120),
  created_by  uuid references public.app_users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Två företag får inte heta samma sak, oavsett versaler.
create unique index if not exists ad_companies_name_key on public.ad_companies (lower(trim(name)));

create table if not exists public.ad_company_members (
  company_id  uuid not null references public.ad_companies(id) on delete cascade,
  user_id     uuid not null references public.app_users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index if not exists ad_company_members_user_idx on public.ad_company_members (user_id);

alter table public.ad_companies enable row level security;
alter table public.ad_company_members enable row level security;

revoke all on public.ad_companies from anon, authenticated;
revoke all on public.ad_company_members from anon, authenticated;
