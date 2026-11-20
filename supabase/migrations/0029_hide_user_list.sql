-- Användarlistan (id + namn) var anropbar med anon-nyckeln, så vem som helst
-- kunde hämta alla namn och sedan bara behöva gissa PIN-koden.
-- Agency hämtar listan på servern med service-role (/api/todo/board), så den
-- påverkas inte. Den gamla kopian i jock3/claude apps/mediaplan anropade den
-- från webbläsaren; den läser redan låsta todo-tabeller.
revoke execute on function public.app_list_users_public() from public, anon, authenticated;
grant  execute on function public.app_list_users_public() to service_role;
