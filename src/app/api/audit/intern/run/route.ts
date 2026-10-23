import { NextRequest, NextResponse } from "next/server";
import { toActions } from "@/lib/audit/actions";
import { score } from "@/lib/audit/checks";
import { auditSite, SiteError } from "@/lib/audit/crawl";
import { FetchError, normalizeUrl } from "@/lib/audit/fetch";
import { auditError } from "@/lib/audit/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Intern, bakom inloggning via proxy. Granskar alltid på nytt, utan cache och
 * gränser, och sparar körningen i audit_internal_runs så att historiken finns
 * kvar. Hålls isär från det publika verktygets audit_runs.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.url !== "string") return auditError("INVALID_URL");

  let start: URL;
  try {
    start = normalizeUrl(body.url);
  } catch (err) {
    return auditError(err instanceof FetchError ? err.code : "INVALID_URL");
  }

  let audit;
  try {
    audit = await auditSite(start);
  } catch (err) {
    if (err instanceof FetchError || err instanceof SiteError) return auditError(err.code, 422);
    throw err;
  }

  const token = getSessionToken(request);
  const user = token ? await validateSession(token).catch(() => null) : null;

  const scores = score(audit.checks);
  const { data, error } = await getSupabaseAdminClient()
    .from("audit_internal_runs")
    .insert({
      url: start.toString(),
      final_url: audit.finalUrl,
      host: new URL(audit.finalUrl).hostname,
      score: scores.score,
      seo_score: scores.seoScore,
      geo_score: scores.geoScore,
      checks: audit.checks,
      actions: toActions(audit.checks),
      pages: audit.pages,
      created_by: user?.name ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return auditError("SERVER_ERROR", 500);

  return NextResponse.json({ id: data.id });
}
