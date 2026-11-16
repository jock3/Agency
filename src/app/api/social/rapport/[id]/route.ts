import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid, memberCompany, userFromRequest } from "@/lib/ads/access";
import { parseRows } from "@/lib/social/report";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v: unknown): v is string => typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v));

/** Rapporten, om användaren är medlem i dess företag. Annars null (samma svar som för okänt id). */
async function ownReport(userId: string, id: string) {
  if (!isUuid(id)) return null;
  const sb = getSupabaseAdminClient();
  const { data } = await sb.from("ad_reports").select("id, company_id, period_start, period_end").eq("id", id).maybeSingle();
  if (!data || !(await memberCompany(userId, data.company_id as string))) return null;
  return data as { id: string; company_id: string; period_start: string; period_end: string };
}

/** Sparar rubrik, period och siffror. Ett fält som saknas lämnas orört. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  const { id } = await params;
  const report = await ownReport(user.user_id, id);
  if (!report) return adsError("NOT_FOUND", 404);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return adsError("INVALID_BODY");
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 1 || title.length > 120) return adsError("INVALID_TITLE");
    update.title = title;
  }
  if (body.periodStart !== undefined || body.periodEnd !== undefined) {
    const start = body.periodStart ?? report.period_start;
    const end = body.periodEnd ?? report.period_end;
    if (!isDate(start) || !isDate(end) || end < start) return adsError("INVALID_PERIOD");
    update.period_start = start;
    update.period_end = end;
  }
  if (body.rows !== undefined) {
    const rows = parseRows(body.rows);
    if (!rows) return adsError("INVALID_ROWS");
    update.rows = rows;
    // Siffrorna ändras, så en gammal AI-text stämmer inte längre.
    update.ai_summary = null;
    update.ai_generated_at = null;
  }

  const { error } = await getSupabaseAdminClient().from("ad_reports").update(update).eq("id", id);
  if (error) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ ok: true });
}

/** Tar bort rapporten. */
export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!(await ownReport(user.user_id, id))) return adsError("NOT_FOUND", 404);
  const { error } = await getSupabaseAdminClient().from("ad_reports").delete().eq("id", id);
  if (error) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ ok: true });
}
