"use server";

import { authedDb, pick } from "@/lib/api/server";
import type { CampaignPlatform } from "@/lib/types";

/** Columns the browser may change. */
const FIELDS = [
  "platform_name",
  "start_date",
  "end_date",
  "status",
  "budget",
  "color",
  "sort_order",
] as const;

export async function createCampaignPlatform(
  campaignId: string,
  platformName: string,
  sortOrder = 0
): Promise<CampaignPlatform> {
  const sb = await authedDb();
  const { data, error } = await sb
    .from("campaign_platforms")
    .insert({ campaign_id: campaignId, platform_name: platformName, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCampaignPlatform(id: string, updates: Partial<CampaignPlatform>): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("campaign_platforms").update(pick<CampaignPlatform>(updates, FIELDS)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCampaignPlatform(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("campaign_platforms").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
