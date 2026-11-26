-- Verktygen en användare själv har dolt på startsidan och i menyn. Låg tidigare
-- bara i en kaka i webbläsaren (hidden_tools), så valet följde inte med till
-- mobilen. Nu sparas det per konto; kakan finns kvar som reserv tills en rad finns.
--
-- Ny tabell, rör ingen befintlig data. En rad per användare; saknas raden gäller
-- kakan. En rad med tom lista betyder att användaren dolt inget.
-- Prefixet agency_ eftersom databasen delas med övriga appar, och samma
-- åtkomstmodell som övriga Agency-tabeller: RLS på, inga policyer, grants
-- borttagna. All åtkomst går via servern med service-role efter kontroll av
-- sessionen, så anon-nyckeln når ingenting.

create table if not exists public.agency_user_hidden_tools (
  user_id     uuid primary key references public.app_users(id) on delete cascade,
  hidden      text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table public.agency_user_hidden_tools enable row level security;
revoke all on public.agency_user_hidden_tools from anon, authenticated;
