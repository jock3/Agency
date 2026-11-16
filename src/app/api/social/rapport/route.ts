import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid, memberCompany, userFromRequest } from "@/lib/ads/access";
import { parseRows } from "@/lib/social/report";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v: unknown): v is string => typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v));

/** Skapar en tom rapport i ett företag. Kräver medlemskap. */
export async function POST(request: NextRequest) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);

  const body = await request.json().catch(() => null);
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!isUuid(companyId)) return adsError("NOT_FOUND", 404);
  if (title.length < 1 || title.length > 120) return adsError("INVALID_TITLE");
  if (!isDate(body?.periodStart) || !isDate(body?.periodEnd) || body.periodEnd < body.periodStart) return adsError("INVALID_PERIOD");

  if (!(await memberCompany(user.user_id, companyId))) return adsError("NOT_FOUND", 404);

  const rows = body?.rows === undefined ? [] : parseRows(body.rows);
  if (!rows) return adsError("INVALID_ROWS");

  const { data, error } = await getSupabaseAdminClient()
    .from("ad_reports")
    .insert({ company_id: companyId, title, period_start: body.periodStart, period_end: body.periodEnd, rows, created_by: user.user_id })
    .select("id")
    .single();
  if (error || !data) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ id: data.id });
}
