-- Annonsverktyget, steg 2: tillgångar (bildbank och PNG-mallar) per företag.
--
-- Samma åtkomstmodell som 0016: RLS på, inga policyer, grants borttagna. All
-- läsning och skrivning går via /api/annonser/*, som kontrollerar medlemskapet
-- först. Filerna ligger i en privat bucket och visas med kortlivade signerade
-- URL:er, så att ett företags bilder inte går att nå utan medlemskap.
-- Sökvägen i storage börjar alltid med company_id.

create table if not exists public.ad_assets (
  id            uuid primary key,
  company_id    uuid not null references public.ad_companies(id) on delete cascade,
  kind          text not null check (kind in ('photo', 'overlay')),
  storage_path  text not null unique,
  filename      text not null default '',
  mime          text not null check (mime in ('image/png', 'image/jpeg', 'image/webp')),
  bytes         integer not null check (bytes > 0),
  width         integer check (width > 0),
  height        integer check (height > 0),
  description   text not null default '' check (length(description) <= 1000),
  tags          text[] not null default '{}',
  source        text not null default 'uploaded_own' check (source in ('generated', 'uploaded_own', 'uploaded_other')),
  created_by    uuid references public.app_users(id) on delete set null,
  created_at    timestamptz not null default now(),
  -- Mallar måste vara PNG, för genomskinligheten.
  check (kind <> 'overlay' or mime = 'image/png')
);

create index if not exists ad_assets_company_idx on public.ad_assets (company_id, kind, created_at desc);

alter table public.ad_assets enable row level security;
revoke all on public.ad_assets from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-assets', 'ad-assets', false, 15728640, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
