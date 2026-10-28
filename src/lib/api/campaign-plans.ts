"use server";

import { authedDb, pick } from "@/lib/api/server";
import type { CampaignPlan, FullCampaignPlan } from "@/lib/types";

/** Columns the browser may change. */
const FIELDS = [
  "name",
  "period_start",
  "period_end",
  "archived",
  "client_id",
  "status",
  "tags",
] as const;

export async function getCampaignPlans(): Promise<CampaignPlan[]> {
  const sb = await authedDb();
  const { data, error } = await sb
    .from("campaign_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFullCampaignPlan(id: string): Promise<FullCampaignPlan | null> {
  const sb = await authedDb();

  const [planRes, campaignsRes] = await Promise.all([
    sb.from("campaign_plans").select("*").eq("id", id).single(),
    sb.from("campaigns").select("*").eq("plan_id", id).order("sort_order"),
  ]);

  if (planRes.error || !planRes.data) return null;

  const campaignIds = (campaignsRes.data ?? []).map((c: { id: string }) => c.id);
  const platformsRes = campaignIds.length > 0
    ? await sb.from("campaign_platforms").select("*").in("campaign_id", campaignIds).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
    : { data: [] };

  const campaigns = (campaignsRes.data ?? []).map((c: { id: string }) => ({
    ...c,
    platforms: (platformsRes.data ?? []).filter((p: { campaign_id: string }) => p.campaign_id === c.id),
  }));

  return {
    ...planRes.data,
    campaigns,
  };
}

export async function createCampaignPlan(
  name: string,
  periodStart: string,
  periodEnd: string
): Promise<CampaignPlan> {
  const sb = await authedDb();
  const { data, error } = await sb
    .from("campaign_plans")
    .insert({ name, period_start: periodStart, period_end: periodEnd })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCampaignPlan(id: string, updates: Partial<CampaignPlan>): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("campaign_plans").update(pick<CampaignPlan>(updates, FIELDS)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function archiveCampaignPlan(id: string, archived: boolean): Promise<void> {
  await updateCampaignPlan(id, { archived });
}

export async function deleteCampaignPlan(id: string): Promise<void> {
  const sb = await authedDb();
  const { error } = await sb.from("campaign_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function duplicateCampaignPlan(id: string): Promise<CampaignPlan> {
  const sb = await authedDb();
  const original = await getFullCampaignPlan(id);
  if (!original) throw new Error("Plan not found");

  const { data: newPlan, error: planErr } = await sb
    .from("campaign_plans")
    .insert({
      name: original.name + " (kopia)",
      period_start: original.period_start,
      period_end: original.period_end,
    })
    .select()
    .single();
  if (planErr) throw new Error(planErr.message);

  for (const campaign of original.campaigns) {
    const { data: newCampaign, error: campaignErr } = await sb
      .from("campaigns")
      .insert({ plan_id: newPlan.id, name: campaign.name, budget: campaign.budget, color: campaign.color, sort_order: campaign.sort_order })
      .select()
      .single();
    if (campaignErr) throw new Error(campaignErr.message);

    if (campaign.platforms.length > 0) {
      const newPlatforms = campaign.platforms.map((p) => ({
        campaign_id: newCampaign.id,
        platform_name: p.platform_name,
        start_date: p.start_date,
        end_date: p.end_date,
        status: p.status,
        budget: p.budget,
        color: p.color,
        sort_order: p.sort_order,
      }));
      const { error: platformErr } = await sb.from("campaign_platforms").insert(newPlatforms);
      if (platformErr) throw new Error(platformErr.message);
    }
  }

  return newPlan;
}
