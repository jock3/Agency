-- Förslag på nya verktyg och ändringar i befintliga (/forslag, och Förslag i
-- Kontrollcentret). Alla inloggade ser alla förslag och kan rösta; bara admin
-- sätter status, svarar och gör förslag till uppgifter.
--
-- Nya tabeller, rör ingen befintlig data. Prefixet agency_ eftersom databasen
-- delas med övriga appar. Samma åtkomstmodell som övriga Agency-tabeller: RLS på,
-- inga policyer, grants borttagna. All åtkomst går via servern med service-role
-- efter kontroll av sessionen, så anon-nyckeln når ingenting.

create table if not exists public.agency_tool_requests (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid references public.app_users(id) on delete set null,
  kind         text not null check (kind in ('new', 'change')),
  tool         text check (tool in ('mediaplan', 'kampanj', 'formatkoll', 'social', 'audit', 'tillganglighet', 'todo', 'kanban')),
  title        text not null check (char_length(title) between 3 and 120),
  body         text not null check (char_length(body) between 1 and 2000),
  why          text not null default '' check (char_length(why) <= 2000),
  status       text not null default 'new' check (status in ('new', 'considering', 'planned', 'done', 'declined')),
  admin_reply  text check (admin_reply is null or char_length(admin_reply) <= 1000),
  task_id      uuid references public.todo_tasks(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Ändring gäller alltid ett visst verktyg; nytt verktyg har inget.
  check ((kind = 'change') = (tool is not null))
);

create index if not exists agency_tool_requests_created_at_idx on public.agency_tool_requests (created_at desc);
create index if not exists agency_tool_requests_created_by_idx on public.agency_tool_requests (created_by);

create table if not exists public.agency_tool_request_votes (
  request_id  uuid not null references public.agency_tool_requests(id) on delete cascade,
  user_id     uuid not null references public.app_users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (request_id, user_id)
);

create index if not exists agency_tool_request_votes_user_idx on public.agency_tool_request_votes (user_id);

alter table public.agency_tool_requests enable row level security;
alter table public.agency_tool_request_votes enable row level security;
revoke all on public.agency_tool_requests from anon, authenticated;
revoke all on public.agency_tool_request_votes from anon, authenticated;
