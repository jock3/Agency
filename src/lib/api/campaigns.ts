import { getSupabaseClient } from "@/lib/supabase/client";
import type { Campaign } from "@/lib/types";

const CAMPAIGN_COLORS = [
  "#E60330", "#f59e0b", "#10b981", "#931644", "#5B173C",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

export async function createCampaign(planId: string, name: string, sortOrder = 0): Promise<Campaign> {
  const sb = getSupabaseClient();
  const color = CAMPAIGN_COLORS[sortOrder % CAMPAIGN_COLORS.length];
  const { data, error } = await sb
    .from("campaigns")
    .insert({ plan_id: planId, name, color, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("campaigns").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteCampaign(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}
