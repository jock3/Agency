import { after, NextRequest, NextResponse } from "next/server";
import { writeAdvice } from "@/lib/audit/advice";
import { getDemoRun, isDemo } from "@/lib/audit/demo";
import { notifyLead } from "@/lib/audit/notify";
import { auditError } from "@/lib/audit/server";
import type { AuditAction, Check, PageExtract, UnlockedAudit } from "@/lib/audit/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Publik: sparar e-posten som lead och lämnar ut åtgärderna. Åtgärderna
 * genereras vid första upplåsningen och sparas på körningen, så Claude anropas
 * högst en gång per körning oavsett hur många som låser upp den.
 *
 * En ny lead mejlas till säljaren efter att svaret skickats, så besökaren
 * inte väntar på mejlet. Samma e-post på samma körning räknas bara en gång.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!UUID.test(id)) return auditError("NOT_FOUND", 404);
  if (!EMAIL.test(email) || email.length > 254) return auditError("INVALID_EMAIL");
  if (body?.consent !== true) return auditError("CONSENT_REQUIRED");

  if (isDemo()) {
    const demoRun = getDemoRun(id);
    if (!demoRun) return auditError("NOT_FOUND", 404);
    return NextResponse.json(await writeAdvice(demoRun.finalUrl, demoRun.checks, demoRun.extract));
  }

  const sb = getSupabaseAdminClient();
  const { data: run } = await sb
    .from("audit_runs")
    .select("id, final_url, host, score, seo_score, geo_score, pages, checks, extract, summary, actions")
    .eq("id", id)
    .maybeSingle();
  if (!run) return auditError("NOT_FOUND", 404);

  const existing = await sb.from("audit_leads").select("id").eq("run_id", id).eq("email", email).limit(1);
  const isNew = !existing.data?.length;
  if (isNew) {
    const lead = await sb.from("audit_leads").insert({ run_id: id, email, consent: true });
    if (lead.error) return auditError("SERVER_ERROR", 500);
  }

  let advice: UnlockedAudit;
  if (run.summary && run.actions) {
    advice = { summary: run.summary, actions: run.actions as AuditAction[] };
  } else {
    advice = await writeAdvice(run.final_url, run.checks as Check[], run.extract as PageExtract);
    await sb.from("audit_runs").update({ summary: advice.summary, actions: advice.actions }).eq("id", id);
  }

  if (isNew) {
    after(() =>
      notifyLead({
        email,
        url: run.final_url,
        host: run.host,
        score: run.score,
        seoScore: run.seo_score,
        geoScore: run.geo_score,
        pageCount: Array.isArray(run.pages) ? run.pages.length : 1,
        summary: advice.summary,
        actions: advice.actions,
        adminUrl: new URL("/audit", request.nextUrl.origin).toString(),
      }),
    );
  }

  return NextResponse.json(advice);
}
