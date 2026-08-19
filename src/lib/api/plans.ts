import { getSupabaseClient } from "@/lib/supabase/client";
import type { MediaPlan, FullMediaPlan } from "@/lib/types";

export async function getPlans(): Promise<MediaPlan[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("media_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getFullPlan(id: string): Promise<FullMediaPlan | null> {
  const sb = getSupabaseClient();

  // Step 1: fetch plan + categories + concepts + deadlines in parallel
  const [planRes, conceptsRes, categoriesRes, deadlinesRes] = await Promise.all([
    sb.from("media_plans").select("*").eq("id", id).single(),
    sb.from("media_concepts").select("*").eq("plan_id", id).order("sort_order"),
    sb.from("media_categories").select("*").eq("plan_id", id).order("sort_order"),
    sb.from("media_deadlines").select("*").eq("plan_id", id).order("created_at", { ascending: true }),
  ]);

  if (planRes.error || !planRes.data) return null;

  // Step 2: fetch only lines belonging to this plan's categories
  const categoryIds = (categoriesRes.data ?? []).map((c: { id: string }) => c.id);
  const linesRes = categoryIds.length > 0
    ? await sb.from("media_lines").select("*").in("category_id", categoryIds).order("sort_order", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true })
    : { data: [] };

  const categories = (categoriesRes.data ?? []).map((cat: { id: string }) => ({
    ...cat,
    lines: (linesRes.data ?? []).filter((l: { category_id: string }) => l.category_id === cat.id),
  }));

  return {
    ...planRes.data,
    concepts: conceptsRes.data ?? [],
    categories,
    deadlines: deadlinesRes.data ?? [],
  };
}

export async function getFullPlanByToken(token: string): Promise<FullMediaPlan | null> {
  const sb = getSupabaseClient();
  const { data: plan, error } = await sb
    .from("media_plans")
    .select("*")
    .eq("share_token", token)
    .single();
  if (error || !plan) return null;
  return getFullPlan(plan.id);
}

export async function createPlan(
  campaignName: string,
  periodStart: string,
  periodEnd: string
): Promise<MediaPlan> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("media_plans")
    .insert({ campaign_name: campaignName, period_start: periodStart, period_end: periodEnd })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlan(id: string, updates: Partial<MediaPlan>): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_plans").update(updates).eq("id", id);
  if (error) throw error;
}

export async function archivePlan(id: string, archived: boolean): Promise<void> {
  await updatePlan(id, { archived });
}

export async function deletePlan(id: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb.from("media_plans").delete().eq("id", id);
  if (error) throw error;
}

export async function generateShareToken(id: string): Promise<string> {
  const sb = getSupabaseClient();
  const { data: existing } = await sb
    .from("media_plans")
    .select("share_token")
    .eq("id", id)
    .single();
  if (existing?.share_token) return existing.share_token;

  const { data, error } = await sb
    .from("media_plans")
    .update({ share_token: crypto.randomUUID().replace(/-/g, "") })
    .eq("id", id)
    .select("share_token")
    .single();
  if (error) throw error;
  return data.share_token;
}

export async function getShareTokenByClientId(clientId: string): Promise<string | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("media_plans")
    .select("share_token")
    .eq("client_id", clientId)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0 || !data[0].share_token) return null;
  return data[0].share_token;
}

export async function duplicatePlan(id: string): Promise<MediaPlan> {
  const sb = getSupabaseClient();
  const original = await getFullPlan(id);
  if (!original) throw new Error("Plan not found");

  const { data: newPlan, error: planErr } = await sb
    .from("media_plans")
    .insert({
      campaign_name: original.campaign_name + " (kopia)",
      period_start: original.period_start,
      period_end: original.period_end,
    })
    .select()
    .single();
  if (planErr) throw planErr;

  for (const cat of original.categories) {
    const { data: newCat, error: catErr } = await sb
      .from("media_categories")
      .insert({ plan_id: newPlan.id, name: cat.name, color: cat.color, budget: cat.budget, sort_order: cat.sort_order })
      .select()
      .single();
    if (catErr) throw catErr;

    if (cat.lines.length > 0) {
      const newLines = cat.lines.map((l) => ({
        category_id: newCat.id,
        platform_name: l.platform_name,
        cost_per_unit: l.cost_per_unit,
        unit_type: l.unit_type,
        quantity: l.quantity,
        color: l.color,
        start_date: l.start_date,
        end_date: l.end_date,
        sort_order: l.sort_order,
        estimated_reach: l.estimated_reach,
      }));
      const { error: lineErr } = await sb.from("media_lines").insert(newLines);
      if (lineErr) throw lineErr;
    }
  }

  return newPlan;
}
