import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { FullCampaignPlan } from "@/lib/types";
import CampaignShareView from "./CampaignShareView";

async function getFullCampaignPlanByToken(token: string): Promise<FullCampaignPlan | null> {
  const sb = getSupabaseServerClient();

  const { data: plan, error: planErr } = await sb
    .from("campaign_plans")
    .select("*")
    .eq("share_token", token)
    .single();

  if (planErr || !plan) return null;

  const campaignsRes = await sb.from("campaigns").select("*").eq("plan_id", plan.id).order("sort_order");

  const campaignIds = (campaignsRes.data ?? []).map((c: { id: string }) => c.id);
  const platformsRes = campaignIds.length > 0
    ? await sb.from("campaign_platforms").select("*").in("campaign_id", campaignIds).order("sort_order", { ascending: true })
    : { data: [] };

  const campaigns = (campaignsRes.data ?? []).map((c: { id: string }) => ({
    ...c,
    platforms: (platformsRes.data ?? []).filter((p: { campaign_id: string }) => p.campaign_id === c.id),
  }));

  return {
    ...plan,
    campaigns,
  };
}

export default async function CampaignSharePage({ params }: { params: { token: string } }) {
  const plan = await getFullCampaignPlanByToken(params.token);

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-700">Länken är inte giltig</h1>
          <p className="text-gray-400 text-sm mt-1">Kampanjen kanske inte längre är delad.</p>
        </div>
      </div>
    );
  }

  return <CampaignShareView plan={plan} />;
}
