import { getSupabaseClient } from "@/lib/supabase/client";
import type { MediaConcept } from "@/lib/types";

const CONCEPT_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

export async function createConcept(
  planId: string,
  periodStart: string,
  periodEnd: string,
  sortOrder: number
): Promise<MediaConcept> {
  const sb = getSupabaseClient();
  const color = CONCEPT_COLORS[sortOrder % CONCEPT_COLORS.length];
  const { data, error } = await sb
    .from("media_concepts")
    .insert({
      plan_id: planId,
      name: "Nytt koncept",
      start_date: periodStart,
      end_date: periodEnd,
      color,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConcept(id: string, updates: Partial<MediaConcept>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_concepts").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteConcept(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_concepts").delete().eq("id", id);
  if (error) throw error;
}
