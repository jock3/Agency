-- Kontrollcentret (/admin): vilka verktyg en användare får använda, och byte
-- av PIN-kod för den som glömt sin.
--
-- Verktygsåtkomst: en rad per begränsad användare med listan över tillåtna
-- verktyg. Saknas raden har användaren alla verktyg, så att befintliga konton
-- fungerar som förut. Admin har alltid alla verktyg, oavsett rad.
-- Tabellen har prefixet agency_ eftersom databasen delas med övriga appar, och
-- samma åtkomstmodell som övriga Agency-tabeller: RLS på, inga policyer, grants
-- borttagna. Läsning sker med service-role-nyckeln i proxyn och i /api/admin.

create table if not exists public.agency_user_tools (
  user_id     uuid primary key references public.app_users(id) on delete cascade,
  tools       text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table public.agency_user_tools enable row level security;
revoke all on public.agency_user_tools from anon, authenticated;

-- Ny PIN-kod, satt av en admin. Nollställer felförsök och lås, och loggar ut
-- användaren överallt utom när admin byter sin egen kod (då vore hon utloggad
-- mitt i arbetet). Bara service_role får köra funktionen; anroparen kontrolleras
-- dessutom här, så att ett läckt anrop utan adminsession ändå nekas.
create or replace function public.app_admin_set_pin(p_token text, p_target_user_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_admin record;
begin
  select * into v_admin from public.app_validate_session(p_token) limit 1;
  if not found or v_admin.is_admin is not true then
    return 'NOT_AUTHORIZED';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return 'INVALID_PIN';
  end if;

  update public.app_users
     set pin_hash = crypt(p_pin, gen_salt('bf')),
         failed_attempts = 0,
         locked_until = null
   where id = p_target_user_id;
  if not found then
    return 'USER_NOT_FOUND';
  end if;

  if p_target_user_id <> v_admin.user_id then
    delete from public.app_sessions where user_id = p_target_user_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.app_admin_set_pin(text, uuid, text) from public, anon, authenticated;
grant  execute on function public.app_admin_set_pin(text, uuid, text) to service_role;
