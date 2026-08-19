import { getSupabaseClient } from "@/lib/supabase/client";
import type { CampaignPlatform } from "@/lib/types";

export async function createCampaignPlatform(
  campaignId: string,
  platformName: string,
  sortOrder = 0
): Promise<CampaignPlatform> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("campaign_platforms")
    .insert({ campaign_id: campaignId, platform_name: platformName, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaignPlatform(id: string, updates: Partial<CampaignPlatform>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("campaign_platforms").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteCampaignPlatform(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("campaign_platforms").delete().eq("id", id);
  if (error) throw error;
}
