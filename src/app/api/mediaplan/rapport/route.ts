import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid, memberCompany, userFromRequest } from "@/lib/ads/access";
import { blankDoc } from "@/lib/report/doc";
import { cleanTags, planPeriod } from "@/lib/report/plan";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Skapar en ny rapport (bara en startsida) i ett företag. Kräver medlemskap. */
export async function POST(request: NextRequest) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => null);
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";
  const planId = typeof body?.planId === "string" ? body.planId : "";
  if (!isUuid(companyId)) return adsError("NOT_FOUND", 404);
  const company = await memberCompany(user.user_id, companyId);
  if (!company) return adsError("NOT_FOUND", 404);
  const db = getSupabaseAdminClient();

  // Skapad från en mediaplan: namn, period och taggar ärvs från planen.
  if (planId) {
    if (!isUuid(planId)) return adsError("NOT_FOUND", 404);
    const [{ data: plan }, { data: existing }] = await Promise.all([
      db.from("media_plans").select("id, campaign_name, period_start, period_end, tags").eq("id", planId).maybeSingle(),
      db.from("report_docs").select("id, company_id").eq("plan_id", planId).maybeSingle(),
    ]);
    if (!plan) return adsError("NOT_FOUND", 404);
    if (existing) {
      // Planen har redan en rapport. Den visas bara för medlemmar i rapportens företag.
      return (await memberCompany(user.user_id, existing.company_id)) ? NextResponse.json({ id: existing.id, existing: true }) : adsError("REPORT_EXISTS", 409);
    }
    const campaign = String(plan.campaign_name ?? "").trim().slice(0, 160);
    const client = typeof body?.client === "string" && body.client.trim() ? body.client.trim().slice(0, 160) : company.name.slice(0, 160);
    const doc = blankDoc(client, campaign);
    doc.meta.period = planPeriod(plan.period_start, plan.period_end);
    const { data, error } = await db
      .from("report_docs")
      .insert({
        company_id: companyId, plan_id: plan.id, title: campaign || client, client, doc,
        tags: cleanTags(plan.tags), period_start: plan.period_start, period_end: plan.period_end, created_by: user.user_id,
      })
      .select("id")
      .single();
    if (error || !data) {
      // Två klick samtidigt: den andra träffar det unika indexet. Visa då den som redan finns.
      const { data: again } = await db.from("report_docs").select("id").eq("plan_id", planId).maybeSingle();
      return again ? NextResponse.json({ id: again.id, existing: true }) : adsError("SERVER_ERROR", 500);
    }
    return NextResponse.json({ id: data.id });
  }

  const client = typeof body?.client === "string" ? body.client.trim() : "";
  const campaign = typeof body?.campaign === "string" ? body.campaign.trim() : "";
  if (client.length < 1 || client.length > 160 || campaign.length > 160) return adsError("INVALID_NAME");

  const { data, error } = await db
    .from("report_docs")
    .insert({ company_id: companyId, title: campaign || client, client, doc: blankDoc(client, campaign), created_by: user.user_id })
    .select("id")
    .single();
  if (error || !data) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ id: data.id });
}
