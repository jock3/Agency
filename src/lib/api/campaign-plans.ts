import { getSupabaseClient } from "@/lib/supabase/client";
import type { CampaignPlan, FullCampaignPlan } from "@/lib/types";

export async function getCampaignPlans(): Promise<CampaignPlan[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("campaign_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getFullCampaignPlan(id: string): Promise<FullCampaignPlan | null> {
  const sb = getSupabaseClient();

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

export async function getFullCampaignPlanByToken(token: string): Promise<FullCampaignPlan | null> {
  const sb = getSupabaseClient();
  const { data: plan, error } = await sb
    .from("campaign_plans")
    .select("*")
    .eq("share_token", token)
    .single();
  if (error || !plan) return null;
  return getFullCampaignPlan(plan.id);
}

export async function createCampaignPlan(
  name: string,
  periodStart: string,
  periodEnd: string
): Promise<CampaignPlan> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("campaign_plans")
    .insert({ name, period_start: periodStart, period_end: periodEnd })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaignPlan(id: string, updates: Partial<CampaignPlan>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("campaign_plans").update(updates).eq("id", id);
  if (error) throw error;
}

export async function archiveCampaignPlan(id: string, archived: boolean): Promise<void> {
  await updateCampaignPlan(id, { archived });
}

export async function deleteCampaignPlan(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("campaign_plans").delete().eq("id", id);
  if (error) throw error;
}

export async function getShareTokenByClientIdCampaign(clientId: string): Promise<string | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("campaign_plans")
    .select("share_token")
    .eq("client_id", clientId)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0 || !data[0].share_token) return null;
  return data[0].share_token;
}

export async function duplicateCampaignPlan(id: string): Promise<CampaignPlan> {
  const sb = getSupabaseClient();
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
  if (planErr) throw planErr;

  for (const campaign of original.campaigns) {
    const { data: newCampaign, error: campaignErr } = await sb
      .from("campaigns")
      .insert({ plan_id: newPlan.id, name: campaign.name, budget: campaign.budget, color: campaign.color, sort_order: campaign.sort_order })
      .select()
      .single();
    if (campaignErr) throw campaignErr;

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
      if (platformErr) throw platformErr;
    }
  }

  return newPlan;
}
