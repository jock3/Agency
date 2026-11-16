-- SoMe-rapportbyggaren (Mediaplan → Rapport), steg 2: sparade rapporter.
--
-- En rapport hör till ett företag (ad_companies) och är ett enda dokument i
-- kolumnen doc (sektioner, plattformar, annonser, logotyper). Dokumentets
-- form valideras i lib/report/doc.ts. Titel och kund ligger även som egna
-- kolumner så att listan kan visas utan att läsa hela dokumentet.
--
-- Samma åtkomstmodell som 0016/0018/0021: RLS på, inga policyer, grants
-- borttagna. All åtkomst går via /api/mediaplan/rapport/* och serversidor som
-- kontrollerar medlemskapet i ad_company_members.
--
-- ad_reports (det första, borttagna rapportförsöket) lämnas kvar tills vidare.

create table if not exists public.report_docs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.ad_companies(id) on delete cascade,
  title       text not null default '' check (length(title) <= 160),
  client      text not null default '' check (length(client) <= 160),
  doc         jsonb not null check (jsonb_typeof(doc) = 'object' and octet_length(doc::text) <= 3000000),
  created_by  uuid references public.app_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists report_docs_company_idx on public.report_docs (company_id, updated_at desc);

alter table public.report_docs enable row level security;
revoke all on public.report_docs from anon, authenticated;
