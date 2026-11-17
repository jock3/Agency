"use server";

import { companiesOf, currentUser, type Company } from "@/lib/ads/access";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Till mediaplanskorten: vilka planer som redan har en rapport (bara i företag
 * du är medlem i) och vilka företag en ny rapport kan skapas i.
 */
export async function getPlanReportLinks(): Promise<{ links: Record<string, string>; companies: Company[] }> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const companies = await companiesOf(user.user_id);
  if (companies.length === 0) return { links: {}, companies };
  const { data, error } = await getSupabaseAdminClient()
    .from("report_docs")
    .select("id, plan_id")
    .in("company_id", companies.map((c) => c.id))
    .not("plan_id", "is", null);
  if (error) throw new Error(error.message);
  const links: Record<string, string> = {};
  for (const r of data ?? []) if (r.plan_id) links[r.plan_id] = r.id;
  return { links, companies };
}
