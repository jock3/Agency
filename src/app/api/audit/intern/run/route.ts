import { NextRequest, NextResponse } from "next/server";
import { toActions } from "@/lib/audit/actions";
import { summarizeAudit } from "@/lib/audit/ai";
import { score } from "@/lib/audit/checks";
import { auditSite, SiteError } from "@/lib/audit/crawl";
import { FetchError } from "@/lib/audit/fetch";
import { auditError } from "@/lib/audit/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Intern, bakom inloggning via proxy. Granskar ett projekts domän på nytt,
 * utan cache och gränser, och sparar körningen i audit_internal_runs. Hålls
 * isär från det publika verktygets audit_runs.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.projectId !== "string") return auditError("NOT_FOUND", 404);

  const sb = getSupabaseAdminClient();
  const { data: project } = await sb.from("audit_projects").select("id, url").eq("id", body.projectId).maybeSingle();
  if (!project) return auditError("NOT_FOUND", 404);

  let audit;
  try {
    audit = await auditSite(new URL(project.url));
  } catch (err) {
    if (err instanceof FetchError || err instanceof SiteError) return auditError(err.code, 422);
    throw err;
  }

  const token = getSessionToken(request);
  const user = token ? await validateSession(token).catch(() => null) : null;

  const scores = score(audit.checks);
  const actions = toActions(audit.checks);
  const aiSummary = await summarizeAudit({
    domain: project.url,
    seoScore: scores.seoScore,
    geoScore: scores.geoScore,
    pageCount: audit.pages.length,
    actions,
  });
  const { data, error } = await sb
    .from("audit_internal_runs")
    .insert({
      project_id: project.id,
      url: project.url,
      final_url: audit.finalUrl,
      host: new URL(audit.finalUrl).hostname,
      score: scores.score,
      seo_score: scores.seoScore,
      geo_score: scores.geoScore,
      checks: audit.checks,
      actions,
      ai_summary: aiSummary,
      pages: audit.pages,
      created_by: user?.name ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return auditError("SERVER_ERROR", 500);

  return NextResponse.json({ id: data.id });
}
