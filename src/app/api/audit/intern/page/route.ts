import { NextRequest, NextResponse } from "next/server";
import { toActions } from "@/lib/audit/actions";
import { suggestForPage } from "@/lib/audit/ai";
import { score } from "@/lib/audit/checks";
import { auditPage, SiteError } from "@/lib/audit/crawl";
import { FetchError, normalizeUrl } from "@/lib/audit/fetch";
import { domainOf } from "@/lib/audit/projects";
import { auditError } from "@/lib/audit/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Intern, bakom inloggning via proxy. Granskar en enskild sida i ett projekt.
 * Adressen kan vara en hel URL eller bara en sökväg ("/om-oss").
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.projectId !== "string" || typeof body?.url !== "string") return auditError("NOT_FOUND", 404);

  const sb = getSupabaseAdminClient();
  const { data: project } = await sb.from("audit_projects").select("id, domain, url").eq("id", body.projectId).maybeSingle();
  if (!project) return auditError("NOT_FOUND", 404);

  const raw = body.url.trim();
  let audit;
  try {
    const target = raw.startsWith("/") ? new URL(raw, project.url) : normalizeUrl(raw);
    if (domainOf(target.hostname) !== project.domain) return auditError("WRONG_DOMAIN", 422);
    audit = await auditPage(target);
  } catch (err) {
    if (err instanceof FetchError || err instanceof SiteError) return auditError(err.code, 422);
    if (err instanceof TypeError) return auditError("INVALID_URL", 422);
    throw err;
  }

  const token = getSessionToken(request);
  const user = token ? await validateSession(token).catch(() => null) : null;

  const scores = score(audit.checks);
  const actions = toActions(audit.checks);
  const ai = await suggestForPage(audit.url, actions);
  const { error } = await sb.from("audit_page_runs").insert({
    project_id: project.id,
    url: audit.url,
    title: audit.title,
    status: audit.status,
    seo_score: scores.seoScore,
    geo_score: scores.geoScore,
    checks: audit.checks,
    actions,
    ai,
    created_by: user?.name ?? null,
  });
  if (error) return auditError("SERVER_ERROR", 500);

  return NextResponse.json({ url: audit.url });
}
