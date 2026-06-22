import { getSupabaseClient } from "@/lib/supabase/client";
import type { MediaPlan, FullMediaPlan } from "@/lib/types";

export async function getPlans(): Promise<MediaPlan[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("media_plans")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFullPlan(id: string): Promise<FullMediaPlan | null> {
  const sb = getSupabaseClient();

  const [planRes, conceptsRes, categoriesRes, linesRes, deadlinesRes] = await Promise.all([
    sb.from("media_plans").select("*").eq("id", id).single(),
    sb.from("media_concepts").select("*").eq("plan_id", id).order("sort_order"),
    sb.from("media_categories").select("*").eq("plan_id", id).order("sort_order"),
    sb.from("media_lines").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }),
    sb.from("media_deadlines").select("*").eq("plan_id", id).order("created_at", { ascending: true }),
  ]);

  if (planRes.error || !planRes.data) return null;

  const categories = (categoriesRes.data ?? []).map((cat) => ({
    ...cat,
    lines: (linesRes.data ?? []).filter((l) => l.category_id === cat.id),
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
