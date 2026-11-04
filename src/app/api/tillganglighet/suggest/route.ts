import { NextRequest, NextResponse } from "next/server";
import { suggestForFinding } from "@/lib/a11y/ai";
import type { Finding } from "@/lib/a11y/score";
import { aiEnabled } from "@/lib/audit/ai";
import { auditError } from "@/lib/audit/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Intern, bakom inloggning via proxy. "Ge förslag" på ett fel i
 * tillgänglighetsgranskningen. Förslagen bygger på exemplen som sparades med
 * körningen, så sajten hämtas inte om och inget sparas.
 */
export async function POST(request: NextRequest) {
  if (!aiEnabled()) return auditError("AI_DISABLED", 503);

  const body = await request.json().catch(() => null);
  if (typeof body?.projectId !== "string" || typeof body?.checkId !== "string") return auditError("NOT_FOUND", 404);

  const sb = getSupabaseAdminClient();
  const query = sb.from("a11y_runs").select("findings").eq("project_id", body.projectId);
  const { data: run } =
    typeof body.runId === "string"
      ? await query.eq("id", body.runId).maybeSingle()
      : await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  const finding = ((run?.findings ?? []) as Finding[]).find((f) => f.id === body.checkId);
  if (!finding) return auditError("NOT_FOUND", 404);

  const results = await suggestForFinding(finding);
  return NextResponse.json({ results });
}
