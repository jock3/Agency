import { AUTO_ORDER, STATUS_MAP } from "./constants";
import { isOverdue, todayISO } from "./utils";
import type { Automation, AutomationType, TodoList, TodoStatus, TodoTask } from "@/lib/types";

export type AutomationEvent =
  | { type: "status"; taskId: string; listId: string; status: TodoStatus }
  | { type: "date_check" };

export interface AutomationResult {
  taskUpdates: { id: string; patch: Partial<TodoTask> }[];
  listUpdates: { id: string; patch: Partial<TodoList> }[];
  fired: string[];
}

interface Context {
  /** Tasks *after* the triggering change has been applied. */
  tasks: TodoTask[];
  lists: TodoList[];
  automations: Automation[];
}

const EMPTY: AutomationResult = { taskUpdates: [], listUpdates: [], fired: [] };

/** Runs the enabled rules for one event and reports the writes they imply.
 *  Nothing is persisted here — the caller applies the result so optimistic
 *  state and the database stay in step. */
export function runAutomations(ev: AutomationEvent, ctx: Context): AutomationResult {
  const enabled = (type: AutomationType) =>
    ctx.automations.find((a) => a.type === type && a.enabled);

  const result: AutomationResult = { taskUpdates: [], listUpdates: [], fired: [] };

  if (ev.type === "date_check") {
    const rule = enabled("overdue_status");
    if (!rule?.config.status) return EMPTY;
    const target = rule.config.status;

    for (const t of ctx.tasks) {
      // overdue_key marks the due date this rule has already reacted to, so
      // moving a date forward re-arms it but a manual status change sticks.
      if (isOverdue(t) && t.overdue_key !== t.due_date && t.status !== target) {
        result.taskUpdates.push({
          id: t.id,
          patch: { status: target, overdue_key: t.due_date, completed: false },
        });
        result.fired.push(
          `"${t.title}" har passerat sitt datum — status sattes till ${STATUS_MAP[target].label}`,
        );
      }
    }
    return result;
  }

  let listId = ev.listId;

  for (const type of AUTO_ORDER) {
    const rule = enabled(type);
    if (!rule) continue;

    const task = ctx.tasks.find((t) => t.id === ev.taskId);
    if (!task) continue;

    if (type === "date_on_done" && ev.status === "done") {
      result.taskUpdates.push({ id: task.id, patch: { due_date: todayISO() } });
      result.fired.push(`Datumet sattes till idag på "${task.title}"`);
    }

    if (
      type === "move_on_status" &&
      ev.status === rule.config.status &&
      rule.config.listId &&
      rule.config.listId !== listId
    ) {
      const target = ctx.lists.find((l) => l.id === rule.config.listId);
      if (target) {
        result.taskUpdates.push({ id: task.id, patch: { list_id: target.id } });
        result.fired.push(`"${task.title}" flyttades till ${target.name}`);
        listId = target.id;
      }
    }

    if (type === "collapse_done" && ev.status === "done") {
      const list = ctx.lists.find((l) => l.id === listId);
      const siblings = ctx.tasks.filter((t) => t.list_id === listId);
      if (list && !list.collapsed && siblings.length > 0 && siblings.every((t) => t.status === "done")) {
        result.listUpdates.push({ id: list.id, patch: { collapsed: true } });
        result.fired.push(`Gruppen "${list.name}" är klar och fälldes ihop`);
      }
    }
  }

  return result;
}

/** The status a brand new task should get, per the default_status rule. */
export function defaultStatus(automations: Automation[]): TodoStatus {
  const rule = automations.find((a) => a.type === "default_status" && a.enabled);
  return rule?.config.status ?? "todo";
}
