"use server";

import { authedDb, pick } from "@/lib/api/server";
import type { Campaign } from "@/lib/types";

/** Columns the browser may change. */
const FIELDS = [
  "name",
  "budget",
  "color",
  "sort_order",
] as const;

const CAMPAIGN_COLORS = [
  "#E60330", "#f59e0b", "#10b981", "#931644", "#5B173C",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

export async function createCampaign(planId: string, name: string, sortOrder = 0): Promise<Campaign> {
  const sb = await authedDb();
  const color = CAMPAIGN_COLORS[sortOrder % CAMPAIGN_COLORS.length];
  const { data, error } = await sb
    .from("campaigns")
    .insert({ plan_id: planId, name, color, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("campaigns").update(pick<Campaign>(updates, FIELDS)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCampaign(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
