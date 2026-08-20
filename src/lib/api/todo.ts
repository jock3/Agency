import { DEFAULT_AUTOMATIONS, GROUP_COLORS } from "@/lib/todo/constants";
import type {
  Automation,
  BoardSettings,
  TodoColumnKey,
  TodoList,
  TodoSubtask,
  TodoTask,
} from "@/lib/types";

/* The browser never talks to PostgREST for board data. The anon key ships in
 * the JS bundle, so anything it can reach is effectively public; these routes
 * check the session cookie and use the service role on the far side. */

export interface UserOption {
  id: string;
  name: string;
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/todo/${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} /api/todo/${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/* ── Hela tavlan ──────────────────────────────────────────────────── */

export interface Board {
  lists: TodoList[];
  tasks: TodoTask[];
  subtasks: TodoSubtask[];
  users: UserOption[];
  settings: BoardSettings;
}

interface BoardSettingsRow {
  board_title: string | null;
  hidden_cols: TodoColumnKey[] | null;
  automations: Automation[] | null;
}

interface BoardResponse {
  lists: TodoList[];
  tasks: TodoTask[];
  subtasks: TodoSubtask[];
  users: UserOption[];
  settings: BoardSettingsRow | null;
}

export async function getBoard(): Promise<Board> {
  const data = await send<BoardResponse>("board", "GET");
  return {
    lists: data.lists,
    tasks: data.tasks.map(normalizeTask),
    subtasks: data.subtasks,
    users: data.users,
    settings: sanitizeSettings(
      data.settings ?? { board_title: null, hidden_cols: null, automations: null },
      data.lists,
    ),
  };
}

/** comments is jsonb, so guard against a row written before the column existed. */
function normalizeTask(t: TodoTask): TodoTask {
  return { ...t, comments: Array.isArray(t.comments) ? t.comments : [] };
}

/** Fills in any automation rule added after the row was written, and drops a
 *  move-target pointing at a group that no longer exists. */
export function sanitizeSettings(raw: BoardSettingsRow, lists: TodoList[]): BoardSettings {
  const known = new Set(lists.map((l) => l.id));
  const stored = Array.isArray(raw.automations) ? raw.automations : [];
  const automations = DEFAULT_AUTOMATIONS.map((def) => {
    const found = stored.find((a) => a.type === def.type);
    if (!found) return def;
    const listId = found.config?.listId;
    return {
      ...def,
      ...found,
      config: { ...found.config, listId: listId && known.has(listId) ? listId : "" },
    };
  });

  return {
    board_title: raw.board_title || "Projekttavlan",
    hidden_cols: Array.isArray(raw.hidden_cols) ? raw.hidden_cols : [],
    automations,
  };
}

export async function saveBoardSettings(patch: Partial<BoardSettings>): Promise<void> {
  await send("settings", "PATCH", patch);
}

/* ── Grupper ──────────────────────────────────────────────────────── */

/** Picks the first unused colour so a new group never repeats a neighbour. */
export function nextGroupColor(lists: TodoList[]): string {
  const used = new Set(lists.map((l) => l.color));
  return GROUP_COLORS.find((c) => !used.has(c)) ?? GROUP_COLORS[lists.length % GROUP_COLORS.length];
}

export function createList(name: string, color: string, sortOrder: number): Promise<TodoList> {
  return send<TodoList>("lists", "POST", { name, color, sort_order: sortOrder });
}

export async function updateList(id: string, updates: Partial<TodoList>): Promise<void> {
  await send("lists", "PATCH", { id, updates });
}

export async function deleteList(id: string): Promise<void> {
  await send("lists", "DELETE", { id });
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  await send("lists/reorder", "POST", { ids: orderedIds });
}

/* ── Objekt ───────────────────────────────────────────────────────── */

export async function createTask(
  listId: string,
  title: string,
  fields: Partial<TodoTask>,
): Promise<TodoTask> {
  const task = await send<TodoTask>("tasks", "POST", { ...fields, list_id: listId, title });
  return normalizeTask(task);
}

export async function updateTask(id: string, updates: Partial<TodoTask>): Promise<void> {
  await send("tasks", "PATCH", { id, updates });
}

export async function updateTasks(ids: string[], updates: Partial<TodoTask>): Promise<void> {
  if (!ids.length) return;
  await send("tasks", "PATCH", { ids, updates });
}

export async function deleteTask(id: string): Promise<void> {
  await send("tasks", "DELETE", { id });
}

export async function deleteTasks(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await send("tasks", "DELETE", { ids });
}

/* ── Underobjekt ──────────────────────────────────────────────────── */

export function createSubtask(
  taskId: string,
  title: string,
  sortOrder: number,
  fields: Partial<TodoSubtask> = {},
): Promise<TodoSubtask> {
  return send<TodoSubtask>("subtasks", "POST", {
    ...fields,
    task_id: taskId,
    title,
    sort_order: sortOrder,
  });
}

export async function updateSubtask(id: string, updates: Partial<TodoSubtask>): Promise<void> {
  await send("subtasks", "PATCH", { id, updates });
}

export async function deleteSubtask(id: string): Promise<void> {
  await send("subtasks", "DELETE", { id });
}
