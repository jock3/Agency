-- Annonsverktyget: ton och bildspråk per företag.
--
-- En rad per företag med materialet som styr hur AI:n skriver och väljer bilder:
--   voice      skrivguide: tilltal, ton, ord att använda och undvika, rubriklängd
--   imagery    bildspråk: stil, ljus, motiv, vad som aldrig ska synas
--   references förebilder: korta texter/annonser som visar hur företaget låter
-- Samma åtkomstmodell som 0016 och 0018: RLS på, inga policyer, grants borttagna.
-- All läsning och skrivning går via /api/annonser/*, som kontrollerar medlemskapet.

create table if not exists public.ad_brand (
  company_id  uuid primary key references public.ad_companies(id) on delete cascade,
  voice       text not null default '' check (length(voice) <= 3000),
  imagery     text not null default '' check (length(imagery) <= 2000),
  "references" jsonb not null default '[]' check (jsonb_typeof("references") = 'array' and jsonb_array_length("references") <= 12),
  updated_by  uuid references public.app_users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.ad_brand enable row level security;
revoke all on public.ad_brand from anon, authenticated;
