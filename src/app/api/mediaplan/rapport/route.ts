import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid, memberCompany, userFromRequest } from "@/lib/ads/access";
import { blankDoc } from "@/lib/report/doc";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Skapar en ny rapport (bara en startsida) i ett företag. Kräver medlemskap. */
export async function POST(request: NextRequest) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => null);
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";
  const client = typeof body?.client === "string" ? body.client.trim() : "";
  const campaign = typeof body?.campaign === "string" ? body.campaign.trim() : "";
  if (!isUuid(companyId)) return adsError("NOT_FOUND", 404);
  if (client.length < 1 || client.length > 160 || campaign.length > 160) return adsError("INVALID_NAME");
  if (!(await memberCompany(user.user_id, companyId))) return adsError("NOT_FOUND", 404);

  const { data, error } = await getSupabaseAdminClient()
    .from("report_docs")
    .insert({ company_id: companyId, title: campaign || client, client, doc: blankDoc(client, campaign), created_by: user.user_id })
    .select("id")
    .single();
  if (error || !data) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ id: data.id });
}
