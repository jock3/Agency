import { getSupabaseClient } from "@/lib/supabase/client";
import type { TodoTask, TodoStatus } from "@/lib/types";

function statusMeta(status: TodoStatus): { completed: boolean; completed_at: string | null } {
  return {
    completed: status === "klar",
    completed_at: status === "klar" ? new Date().toISOString() : null,
  };
}

export async function getAllTasks(): Promise<TodoTask[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from("todo_tasks").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createTask(
  task: Pick<TodoTask, "title" | "list_id" | "priority" | "due_date">
): Promise<TodoTask> {
  const sb = getSupabaseClient();
  const { data: existing } = await sb
    .from("todo_tasks")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1;
  const status: TodoStatus = "ej_paborjad";
  const { data, error } = await sb
    .from("todo_tasks")
    .insert({ ...task, status, sort_order, ...statusMeta(status) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Partial<TodoTask>): Promise<void> {
  const sb = getSupabaseClient();
  const extra = updates.status ? statusMeta(updates.status) : {};
  const { error } = await sb.from("todo_tasks").update({ ...updates, ...extra }).eq("id", id);
  if (error) throw error;
}

export async function completeTask(id: string, completed: boolean): Promise<void> {
  const status: TodoStatus = completed ? "klar" : "ej_paborjad";
  const sb = getSupabaseClient();
  const { error } = await sb
    .from("todo_tasks")
    .update({ completed, status, ...statusMeta(status) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("todo_tasks").delete().eq("id", id);
  if (error) throw error;
}
