import { getSupabaseClient } from "@/lib/supabase/client";
import type { TodoList } from "@/lib/types";

export async function getLists(): Promise<TodoList[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from("todo_lists").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createList(name: string, color: string): Promise<TodoList> {
  const sb = getSupabaseClient();
  const { data: existing } = await sb
    .from("todo_lists")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 1;
  const { data, error } = await sb
    .from("todo_lists")
    .insert({ name, color, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateList(id: string, updates: Partial<Pick<TodoList, "name" | "color">>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("todo_lists").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteList(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("todo_lists").delete().eq("id", id);
  if (error) throw error;
}
