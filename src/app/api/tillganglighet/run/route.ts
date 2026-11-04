import { NextRequest, NextResponse } from "next/server";
import { aggregate } from "@/lib/a11y/score";
import { scanSite } from "@/lib/a11y/scan";
import { SiteError } from "@/lib/audit/crawl";
import { FetchError } from "@/lib/audit/fetch";
import { auditError } from "@/lib/audit/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

// Webbläsaren behöver start, och varje sida renderas på riktigt.
export const maxDuration = 300;

/**
 * Intern, bakom inloggning via proxy. Granskar ett projekts sajt mot WCAG 2.2
 * AA i en riktig webbläsare och sparar körningen i a11y_runs.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.projectId !== "string") return auditError("NOT_FOUND", 404);

  const sb = getSupabaseAdminClient();
  const { data: project } = await sb.from("a11y_projects").select("id, url").eq("id", body.projectId).maybeSingle();
  if (!project) return auditError("NOT_FOUND", 404);

  const began = Date.now();
  let scan;
  try {
    scan = await scanSite(new URL(project.url));
  } catch (err) {
    if (err instanceof SiteError) return auditError(err.code, err.code === "BROWSER_ERROR" ? 500 : 422);
    if (err instanceof FetchError) return auditError(err.code, 422);
    throw err;
  }

  const result = aggregate(scan.pages);
  console.log(`a11y run project=${project.id} pages=${scan.pages.length} score=${result.score} ms=${Date.now() - began}`);

  const token = getSessionToken(request);
  const user = token ? await validateSession(token).catch(() => null) : null;

  const { data, error } = await sb
    .from("a11y_runs")
    .insert({
      project_id: project.id,
      url: project.url,
      final_url: scan.finalUrl,
      host: new URL(scan.finalUrl).hostname,
      score: result.score,
      findings: result.findings,
      manual: result.manual,
      pages: result.pages,
      passes: result.passes,
      created_by: user?.name ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return auditError("SERVER_ERROR", 500);

  return NextResponse.json({ id: data.id });
}
