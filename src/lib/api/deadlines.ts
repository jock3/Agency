import { getSupabaseClient } from "@/lib/supabase/client";
import type { MediaDeadline } from "@/lib/types";

export async function createDeadline(planId: string, date: string): Promise<MediaDeadline> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("media_deadlines")
    .insert({ plan_id: planId, name: "Materialdeadline", date, color: "#ef4444" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDeadline(id: string, updates: Partial<MediaDeadline>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_deadlines").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteDeadline(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_deadlines").delete().eq("id", id);
  if (error) throw error;
}
