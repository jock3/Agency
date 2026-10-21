import { NextRequest, NextResponse } from "next/server";
import { writeAdvice } from "@/lib/audit/advice";
import { getDemoRun, isDemo } from "@/lib/audit/demo";
import { auditError } from "@/lib/audit/server";
import type { Check, PageExtract } from "@/lib/audit/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Publik: sparar e-posten som lead och lämnar ut åtgärderna. Åtgärderna
 * genereras vid första upplåsningen och sparas på körningen, så Claude anropas
 * högst en gång per körning oavsett hur många som låser upp den.
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
    .select("id, final_url, checks, extract, summary, actions")
    .eq("id", id)
    .maybeSingle();
  if (!run) return auditError("NOT_FOUND", 404);

  const lead = await sb.from("audit_leads").insert({ run_id: id, email, consent: true });
  if (lead.error) return auditError("SERVER_ERROR", 500);

  if (run.summary && run.actions) {
    return NextResponse.json({ summary: run.summary, actions: run.actions });
  }

  const advice = await writeAdvice(run.final_url, run.checks as Check[], run.extract as PageExtract);
  await sb.from("audit_runs").update({ summary: advice.summary, actions: advice.actions }).eq("id", id);
  return NextResponse.json(advice);
}
