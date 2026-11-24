-- 0030 — Ta bort säkerhetskopiorna av todo-tabellerna från 2026-10-28.
--
-- De togs inför demodatan och används inte av någon app (ingen vy, ingen
-- främmande nyckel, ingen kod). Godkänt av Gustav 2026-11-24.

drop table if exists public.todo_tasks_backup_20261028;
drop table if exists public.todo_subtasks_backup_20261028;
drop table if exists public.todo_lists_backup_20261028;
