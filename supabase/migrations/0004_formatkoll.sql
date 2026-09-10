-- Formatkoll: förhandsvisning av rörligt i sociala placeringar.
--
-- Åtkomstmodellen skiljer sig från handoffens förslag, eftersom appen inte kör
-- Supabase Auth. Inloggning sker med app_login/app_sessions, och webbläsaren bär
-- anon-nyckeln. Policyer riktade mot `authenticated` vore därför verkningslösa.
-- Samma lösning som todo-tavlan: RLS på, inga policyer, grants borttagna. Allt
-- går genom /api/formatkoll/*, som validerar sessionskakan och sedan använder
-- service-role-nyckeln.
--
-- FÖRE DEPLOY: SUPABASE_SERVICE_ROLE_KEY måste vara satt i Vercel och i
-- .env.local, annars svarar verktyget med fel i stället för tom vy.

create extension if not exists "pgcrypto";

create table if not exists public.formatkoll_projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  client_name text not null default '',
  caption     text not null default '',
  created_by  uuid not null references public.app_users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Delningslänken har en livslängd. Sätts vid skapande till 1, 3 eller 7 dagar
  -- och kan förlängas. Utgången läses i den publika vyn, inte bara i listan.
  expires_at  timestamptz not null default now() + interval '7 days',
  archived_at timestamptz
);

create table if not exists public.formatkoll_assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.formatkoll_projects(id) on delete cascade,
  ratio        text not null check (ratio in ('9:16','1:1','16:9')),
  -- Alltid {slug}/{9x16|1x1|16x9}.mp4. Aldrig originalfilnamnet: svenska tecken
  -- och mellanslag ställer till det i storage-sökvägar. Namnet sparas i filename.
  storage_path text not null,
  filename     text not null,
  size_bytes   bigint,
  -- Filens verkliga mått. Låter kundvyn rita rätt proportion direkt, utan att
  -- först vänta in videons metadata.
  width        int,
  height       int,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, ratio)
);

create index if not exists formatkoll_assets_project_idx
  on public.formatkoll_assets (project_id);
create index if not exists formatkoll_projects_updated_idx
  on public.formatkoll_projects (updated_at desc);

alter table public.formatkoll_projects enable row level security;
alter table public.formatkoll_assets   enable row level security;

-- Inga policyer. Med RLS på och noll policyer ser varje roll som inte förbigår
-- RLS exakt noll rader — bara service-rollen kommer in.
revoke all on public.formatkoll_projects from anon, authenticated;
revoke all on public.formatkoll_assets   from anon, authenticated;

-- Publik bucket: den som har objektets URL kan hämta filen, vilket är hela
-- poängen med delningslänken. Publik betyder inte listbar — så länge ingen
-- select-policy läggs på storage.objects för anon går innehållet inte att
-- räkna upp. Skrivning sker med signerade uppladdnings-URL:er från servern.
insert into storage.buckets (id, name, public)
values ('previews', 'previews', true)
on conflict (id) do update set public = true;
