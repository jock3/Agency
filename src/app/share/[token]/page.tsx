import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { FullMediaPlan } from "@/lib/types";
import ShareView from "./ShareView";

async function getFullPlanByToken(token: string): Promise<FullMediaPlan | null> {
  const sb = getSupabaseServerClient();

  const { data: plan, error: planErr } = await sb
    .from("media_plans")
    .select("*")
    .eq("share_token", token)
    .single();

  if (planErr || !plan) return null;

  const [conceptsRes, categoriesRes, deadlinesRes] = await Promise.all([
    sb.from("media_concepts").select("*").eq("plan_id", plan.id).order("sort_order"),
    sb.from("media_categories").select("*").eq("plan_id", plan.id).order("sort_order"),
    sb.from("media_deadlines").select("*").eq("plan_id", plan.id).order("created_at", { ascending: true }),
  ]);

  const categoryIds = (categoriesRes.data ?? []).map((c: { id: string }) => c.id);
  const linesRes = categoryIds.length > 0
    ? await sb.from("media_lines").select("*").in("category_id", categoryIds).order("sort_order", { ascending: true })
    : { data: [] };

  const categories = (categoriesRes.data ?? []).map((cat: { id: string }) => ({
    ...cat,
    lines: (linesRes.data ?? []).filter((l: { category_id: string }) => l.category_id === cat.id),
  }));

  return {
    ...plan,
    concepts: conceptsRes.data ?? [],
    categories,
    deadlines: deadlinesRes.data ?? [],
  };
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const plan = await getFullPlanByToken(params.token);

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-700">Länken är inte giltig</h1>
          <p className="text-gray-400 text-sm mt-1">Mediaplanen kanske inte längre är delad.</p>
        </div>
      </div>
    );
  }

  return <ShareView plan={plan} />;
}
