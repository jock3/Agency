import { getSupabaseClient } from "@/lib/supabase/client";
import type { MediaLine } from "@/lib/types";

export async function createLine(
  categoryId: string,
  periodStart: string,
  periodEnd: string,
  sortOrder = 0
): Promise<MediaLine> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("media_lines")
    .insert({
      category_id: categoryId,
      platform_name: "Ny rad",
      cost_per_unit: 0,
      unit_type: "per månad",
      quantity: 1,
      color: "#3b82f6",
      start_date: periodStart,
      end_date: periodEnd,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLine(id: string, updates: Partial<MediaLine>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_lines").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteLine(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_lines").delete().eq("id", id);
  if (error) throw error;
}
