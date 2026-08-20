-- Close the anon hole on the board tables.
--
-- These tables carried `for all to public using (true) with check (true)`, which
-- is not a policy so much as an open door: the anon key is embedded in the
-- browser bundle, so anyone who loads the page can read and rewrite the whole
-- board straight through PostgREST.
--
-- The app no longer needs that access. Board reads and writes go through
-- /api/todo/*, which validates the session cookie and then uses the service
-- role, and the service role bypasses RLS. So the fix is to drop the policies
-- and leave RLS enabled with none: every non-bypass role sees zero rows.
--
-- ORDER MATTERS. Before applying this:
--   1. SUPABASE_SERVICE_ROLE_KEY must be set in Vercel and in .env.local.
--   2. The app version that uses /api/todo/* must be deployed.
-- Applying it early breaks /todo in production, because the deployed build
-- still queries these tables directly with the anon key.

drop policy if exists "todo_lists full access"          on public.todo_lists;
drop policy if exists "todo_tasks full access"          on public.todo_tasks;
drop policy if exists "todo_subtasks full access"       on public.todo_subtasks;
drop policy if exists "todo_board_settings full access" on public.todo_board_settings;
drop policy if exists "todo_app_push_subs full access"  on public.todo_app_push_subs;

-- RLS stays on; with no policies these tables answer only to the service role.
alter table public.todo_lists          enable row level security;
alter table public.todo_tasks          enable row level security;
alter table public.todo_subtasks       enable row level security;
alter table public.todo_board_settings enable row level security;
alter table public.todo_app_push_subs  enable row level security;

-- Belt and braces: take the table grants away too, so a future policy added by
-- mistake cannot re-open them on its own.
revoke all on public.todo_lists          from anon, authenticated;
revoke all on public.todo_tasks          from anon, authenticated;
revoke all on public.todo_subtasks       from anon, authenticated;
revoke all on public.todo_board_settings from anon, authenticated;
revoke all on public.todo_app_push_subs  from anon, authenticated;
