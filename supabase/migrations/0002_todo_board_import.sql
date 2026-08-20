-- One-off import of the ai-labb jsonb boards into the relational tables.
--
-- The old app keeps one board per profile; this app has a single shared board,
-- so every profile's groups are appended after whatever the board already holds,
-- with the owner's name prefixed onto the group title. todo_boards is left
-- untouched as a backup — nothing here reads or writes it afterwards.
--
-- Idempotency runs off the imported_boards flag rather than "is the table
-- empty", because the board already had groups of its own before the import.

alter table public.todo_board_settings
  add column if not exists imported_boards boolean not null default false;

do $$
declare
  b          record;
  grp        jsonb;
  it         jsonb;
  sub        jsonb;
  v_list_id  uuid;
  v_task_id  uuid;
  v_sort     int;
  v_isort    int;
  v_ssort    int;
  v_archived boolean;
  v_settings jsonb;
begin
  if (select imported_boards from public.todo_board_settings where id = 1) then
    raise notice 'boards already imported - skipping';
    return;
  end if;

  -- Continue after the groups the board already has.
  select coalesce(max(sort_order), 0) into v_sort from public.todo_lists;

  for b in
    select bo.data, pr.name as owner
      from public.todo_boards bo
      join public.profiles pr on pr.id = bo.profile_id
     order by pr.name
  loop
    -- Live groups first, then the archived ones, so sort_order stays stable.
    foreach v_archived in array array[false, true] loop
      for grp in
        select value
          from jsonb_array_elements(
                 coalesce(b.data -> (case when v_archived then 'archived' else 'groups' end),
                          '[]'::jsonb))
      loop
        v_sort := v_sort + 1;

        insert into public.todo_lists (name, color, sort_order, collapsed, archived, archived_at)
        values (
          b.owner || ' · ' || coalesce(nullif(grp->>'title', ''), 'Namnlös grupp'),
          coalesce(nullif(grp->>'color', ''), '#E60330'),
          v_sort,
          coalesce((grp->>'collapsed')::boolean, false),
          v_archived,
          nullif(grp->>'archivedAt', '')::timestamptz
        )
        returning id into v_list_id;

        v_isort := 0;
        for it in select value from jsonb_array_elements(coalesce(grp->'items', '[]'::jsonb))
        loop
          v_isort := v_isort + 1;

          insert into public.todo_tasks (
            list_id, title, notes, completed, status, priority, due_date,
            start_date, end_date, repeat, comments, overdue_key,
            sort_order, completed_at, created_at, assigned_to
          )
          values (
            v_list_id,
            coalesce(it->>'name', ''),
            nullif(it->>'notes', ''),
            coalesce(it->>'status', 'todo') = 'done',
            coalesce(nullif(it->>'status', ''), 'todo'),
            coalesce(nullif(it->>'priority', ''), 'none'),
            nullif(it->>'date', '')::date,
            nullif(it->>'start', '')::date,
            nullif(it->>'end', '')::date,
            nullif(it->>'repeat', ''),
            coalesce(it->'comments', '[]'::jsonb),
            nullif(it->>'odKey', '')::date,
            v_isort,
            case when it->>'status' = 'done'
                 then coalesce(nullif(it->>'createdAt', '')::timestamptz, now()) end,
            coalesce(nullif(it->>'createdAt', '')::timestamptz, now()),
            (select u.id from public.app_users u where u.name = it->>'person')
          )
          returning id into v_task_id;

          v_ssort := 0;
          for sub in select value from jsonb_array_elements(coalesce(it->'subitems', '[]'::jsonb))
          loop
            v_ssort := v_ssort + 1;

            insert into public.todo_subtasks (
              task_id, title, completed, status, due_date, assigned_to, sort_order, created_at
            )
            values (
              v_task_id,
              coalesce(sub->>'name', ''),
              coalesce(sub->>'status', 'todo') = 'done',
              coalesce(nullif(sub->>'status', ''), 'todo'),
              nullif(sub->>'date', '')::date,
              (select u.id from public.app_users u where u.name = sub->>'person'),
              v_ssort,
              coalesce(nullif(sub->>'createdAt', '')::timestamptz, now())
            );
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;

  -- Automation rules and hidden columns are board-wide, so the first board that
  -- has them wins; the app fills in any rule that is missing on load.
  select bo.data into v_settings
    from public.todo_boards bo
    join public.profiles pr on pr.id = bo.profile_id
   where jsonb_array_length(coalesce(bo.data->'automations', '[]'::jsonb)) > 0
   order by pr.name
   limit 1;

  update public.todo_board_settings
     set automations = case
           when jsonb_array_length(automations) > 0 then automations
           else coalesce(v_settings->'automations', '[]'::jsonb)
         end,
         hidden_cols = case
           when jsonb_array_length(hidden_cols) > 0 then hidden_cols
           else coalesce(v_settings->'hiddenCols', '[]'::jsonb)
         end,
         imported_boards = true,
         updated_at = now()
   where id = 1;
end $$;
