import { getSupabaseClient } from "@/lib/supabase/client";
import type { MediaCategory } from "@/lib/types";

export async function createCategory(planId: string, name: string): Promise<MediaCategory> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("media_categories")
    .insert({ plan_id: planId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Partial<MediaCategory>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_categories").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_categories").delete().eq("id", id);
  if (error) throw error;
}
