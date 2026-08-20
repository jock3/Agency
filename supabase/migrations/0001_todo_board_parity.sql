-- Bring the relational todo tables up to feature parity with the jsonb board
-- that the ai-labb todo app stores in todo_boards: groups gain collapse and
-- archive state, tasks gain a timeline, repeat rule and comments, and subtasks
-- gain the same status/date/person columns their parents have.

-- ── Grupper (todo_lists) ──────────────────────────────────────────
alter table public.todo_lists
  add column if not exists collapsed   boolean not null default false,
  add column if not exists archived    boolean not null default false,
  add column if not exists archived_at timestamptz;

-- ── Objekt (todo_tasks) ───────────────────────────────────────────
alter table public.todo_tasks drop constraint if exists todo_tasks_status_check;

alter table public.todo_tasks
  add column if not exists start_date  date,
  add column if not exists end_date    date,
  add column if not exists repeat      text,
  add column if not exists comments    jsonb not null default '[]'::jsonb,
  add column if not exists overdue_key date;

-- The old four-value enum maps onto the five statuses the board uses.
update public.todo_tasks set status = case status
  when 'ej_paborjad' then 'todo'
  when 'pagar'       then 'working'
  when 'klar'        then 'done'
  when 'avbruten'    then 'stuck'
  else status
end;

alter table public.todo_tasks alter column status set default 'todo';

alter table public.todo_tasks
  add constraint todo_tasks_status_check
  check (status in ('todo','working','stuck','review','done'));

alter table public.todo_tasks
  add constraint todo_tasks_repeat_check
  check (repeat is null or repeat in ('daily','weekdays','weekly','monthly'));

-- ── Underobjekt (todo_subtasks) ───────────────────────────────────
alter table public.todo_subtasks
  add column if not exists status      text not null default 'todo',
  add column if not exists due_date    date,
  add column if not exists assigned_to uuid;

alter table public.todo_subtasks
  add constraint todo_subtasks_status_check
  check (status in ('todo','working','stuck','review','done'));

-- ── Tavelinställningar (en delad tavla) ───────────────────────────
create table if not exists public.todo_board_settings (
  id          smallint primary key default 1 check (id = 1),
  board_title text        not null default 'Projekttavlan',
  hidden_cols jsonb       not null default '[]'::jsonb,
  automations jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

insert into public.todo_board_settings (id) values (1) on conflict (id) do nothing;

alter table public.todo_board_settings enable row level security;

drop policy if exists "todo_board_settings full access" on public.todo_board_settings;
create policy "todo_board_settings full access"
  on public.todo_board_settings for all to public using (true) with check (true);

-- ── Push-prenumerationer scopade mot app_users ────────────────────
-- The ai-labb table (todo_push_subscriptions) is keyed on Supabase auth users
-- and profiles, which this app does not have — it authenticates against
-- app_users with its own session cookie. Writes go through /api/todo/push so
-- the app_user_id comes from the session rather than the browser.
create table if not exists public.todo_app_push_subs (
  id          uuid primary key default gen_random_uuid(),
  app_user_id uuid        not null references public.app_users(id) on delete cascade,
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  created_at  timestamptz not null default now()
);

alter table public.todo_app_push_subs enable row level security;

drop policy if exists "todo_app_push_subs full access" on public.todo_app_push_subs;
create policy "todo_app_push_subs full access"
  on public.todo_app_push_subs for all to public using (true) with check (true);

-- ── Index ─────────────────────────────────────────────────────────
create index if not exists todo_tasks_list_id_idx    on public.todo_tasks (list_id);
create index if not exists todo_tasks_due_date_idx   on public.todo_tasks (due_date);
create index if not exists todo_subtasks_task_id_idx on public.todo_subtasks (task_id);
create index if not exists todo_lists_sort_order_idx on public.todo_lists (sort_order);
