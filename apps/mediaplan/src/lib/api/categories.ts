import { getSupabaseClient } from "@/lib/supabase/client";
import type { MediaCategory } from "@/lib/types";

const CATEGORY_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

export async function createCategory(planId: string, name: string, sortOrder = 0): Promise<MediaCategory> {
  const sb = getSupabaseClient();
  const color = CATEGORY_COLORS[sortOrder % CATEGORY_COLORS.length];
  const { data, error } = await sb
    .from("media_categories")
    .insert({ plan_id: planId, name, color, sort_order: sortOrder })
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
