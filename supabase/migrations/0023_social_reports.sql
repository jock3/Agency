-- Rapportverktyget (Social media → Rapport), steg 1.
--
-- En rapport hör till ett företag (ad_companies) och har en rad per plattform
-- med manuellt inmatade siffror: räckvidd, exponeringar, klick och kostnad.
-- CTR, CPC och CPM räknas ut vid visning och sparas inte.
-- rows: [{ "platform": "Meta", "reach": 0, "impressions": 0, "clicks": 0, "spend": 0 }]
--
-- Samma åtkomstmodell som 0016/0018/0021: RLS på, inga policyer, grants
-- borttagna. All åtkomst går via /api/social/rapport/* och serversidor som
-- kontrollerar medlemskapet i ad_company_members.
-- share_token och ai_summary används av senare steg (kundlänk, AI-sammanfattning).

create table if not exists public.ad_reports (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.ad_companies(id) on delete cascade,
  title           text not null check (length(trim(title)) between 1 and 120),
  period_start    date not null,
  period_end      date not null,
  rows            jsonb not null default '[]' check (jsonb_typeof(rows) = 'array' and jsonb_array_length(rows) <= 20),
  share_token     text unique,
  ai_summary      text check (ai_summary is null or length(ai_summary) <= 6000),
  ai_generated_at timestamptz,
  created_by      uuid references public.app_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists ad_reports_company_idx on public.ad_reports (company_id, period_start desc);

alter table public.ad_reports enable row level security;
revoke all on public.ad_reports from anon, authenticated;
