import { NextRequest, NextResponse } from "next/server";
import { aiEnabled } from "@/lib/audit/ai";
import { FetchError, normalizeUrl } from "@/lib/audit/fetch";
import { domainOf } from "@/lib/audit/projects";
import { auditError } from "@/lib/audit/server";
import { suggestForCheck } from "@/lib/audit/suggest";
import { SITE_LEVEL, SUGGESTABLE } from "@/lib/audit/suggest-kinds";
import type { AuditedPage } from "@/lib/audit/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Intern, bakom inloggning via proxy. "Ge förslag" på ett kort i åtgärdslistan.
 * Med `url` gäller det den sidan; utan tas upp till fyra drabbade sidor ur
 * projektets senaste audit.
 */
export async function POST(request: NextRequest) {
  if (!aiEnabled()) return auditError("AI_DISABLED", 503);

  const body = await request.json().catch(() => null);
  if (typeof body?.projectId !== "string" || typeof body?.checkId !== "string") return auditError("NOT_FOUND", 404);
  const checkId: string = body.checkId;
  if (!SUGGESTABLE.has(checkId)) return auditError("NOT_FOUND", 404);

  const sb = getSupabaseAdminClient();
  const { data: project } = await sb.from("audit_projects").select("id, domain, url").eq("id", body.projectId).maybeSingle();
  if (!project) return auditError("NOT_FOUND", 404);

  const { data: run } = await sb
    .from("audit_internal_runs")
    .select("pages")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pages = ((run?.pages ?? []) as AuditedPage[]).filter((p) => p.status < 400);

  let urls: string[];
  if (typeof body.url === "string" && body.url.trim()) {
    try {
      const target = normalizeUrl(body.url);
      if (domainOf(target.hostname) !== project.domain) return auditError("WRONG_DOMAIN", 422);
      urls = [target.toString()];
    } catch (err) {
      return auditError(err instanceof FetchError ? err.code : "INVALID_URL", 422);
    }
  } else if (SITE_LEVEL.has(checkId)) {
    urls = [pages[0]?.url ?? project.url];
  } else {
    // uniquedesc följer metabeskrivningens kontroll på sidorna; unique följer dubbla titlar.
    const pageCheck = checkId === "uniquedesc" ? "description" : checkId;
    const titleCount = new Map<string, number>();
    pages.forEach((p) => titleCount.set(p.title, (titleCount.get(p.title) ?? 0) + 1));
    let affected = pages.filter((p) =>
      checkId === "unique" ? p.title && (titleCount.get(p.title) ?? 0) > 1 : p.checks?.some((c) => c.id === pageCheck && c.status !== "pass"),
    );
    if (affected.length === 0) affected = pages.slice(0, 3);
    urls = (affected.length ? affected : [{ url: project.url } as AuditedPage]).map((p) => p.url);
  }

  const results = await suggestForCheck(checkId, urls, pages);
  return NextResponse.json({ results });
}
