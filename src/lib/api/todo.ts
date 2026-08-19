import { getSupabaseClient } from "@/lib/supabase/client";
import type { TodoList, TodoTask, TodoSubtask } from "@/lib/types";

const sb = () => getSupabaseClient();

export interface UserOption {
  id: string;
  name: string;
}

export async function getUsers(): Promise<UserOption[]> {
  const { data, error } = await sb().rpc("app_list_users_public");
  if (error) throw error;
  return data as UserOption[];
}

export async function getLists(): Promise<TodoList[]> {
  const { data, error } = await sb().from("todo_lists").select("*").order("sort_order");
  if (error) throw error;
  return data as TodoList[];
}

export async function createList(name: string, color: string, createdBy: string | null): Promise<TodoList> {
  const { data: maxData } = await sb().from("todo_lists").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sort_order = (maxData?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await sb().from("todo_lists").insert({ name, color, sort_order, created_by: createdBy }).select().single();
  if (error) throw error;
  return data as TodoList;
}

export async function updateList(id: string, updates: Partial<Pick<TodoList, "name" | "color">>): Promise<void> {
  const { error } = await sb().from("todo_lists").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await sb().from("todo_lists").delete().eq("id", id);
  if (error) throw error;
}

export async function unassignTasksFromList(listId: string): Promise<void> {
  const { error } = await sb().from("todo_tasks").update({ list_id: null }).eq("list_id", listId);
  if (error) throw error;
}

export async function getAllTasks(): Promise<TodoTask[]> {
  const { data, error } = await sb().from("todo_tasks").select("*").order("sort_order");
  if (error) throw error;
  return data as TodoTask[];
}

export async function createTask(listId: string | null, title: string, createdBy: string | null): Promise<TodoTask> {
  const { data: maxData } = await sb().from("todo_tasks").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sort_order = (maxData?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await sb()
    .from("todo_tasks")
    .insert({ list_id: listId, title, status: "ej_paborjad", priority: "none", completed: false, sort_order, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data as TodoTask;
}

export async function updateTask(id: string, updates: Partial<TodoTask>): Promise<void> {
  const { error } = await sb().from("todo_tasks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await sb().from("todo_tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function getSubtasks(taskId: string): Promise<TodoSubtask[]> {
  const { data, error } = await sb().from("todo_subtasks").select("*").eq("task_id", taskId).order("sort_order");
  if (error) throw error;
  return data as TodoSubtask[];
}

export async function getAllSubtasks(): Promise<TodoSubtask[]> {
  const { data, error } = await sb().from("todo_subtasks").select("*").order("sort_order");
  if (error) throw error;
  return data as TodoSubtask[];
}

export async function createSubtask(taskId: string, title: string): Promise<TodoSubtask> {
  const { data: maxData } = await sb().from("todo_subtasks").select("sort_order").eq("task_id", taskId).order("sort_order", { ascending: false }).limit(1);
  const sort_order = (maxData?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await sb()
    .from("todo_subtasks")
    .insert({ task_id: taskId, title, completed: false, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data as TodoSubtask;
}

export async function updateSubtask(id: string, updates: Partial<TodoSubtask>): Promise<void> {
  const { error } = await sb().from("todo_subtasks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await sb().from("todo_subtasks").delete().eq("id", id);
  if (error) throw error;
}
