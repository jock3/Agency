import { getSupabaseClient } from "@/lib/supabase/client";
import type { TodoSubtask } from "@/lib/types";

export async function getSubtasks(taskId: string): Promise<TodoSubtask[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("todo_subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createSubtask(taskId: string, title: string): Promise<TodoSubtask> {
  const sb = getSupabaseClient();
  const { data: existing } = await sb
    .from("todo_subtasks")
    .select("sort_order")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await sb
    .from("todo_subtasks")
    .insert({ task_id: taskId, title, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubtask(
  id: string,
  updates: Partial<Pick<TodoSubtask, "title" | "completed">>
): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("todo_subtasks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteSubtask(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("todo_subtasks").delete().eq("id", id);
  if (error) throw error;
}
