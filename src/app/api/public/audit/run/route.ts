import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { score } from "@/lib/audit/checks";
import { auditSite, SiteError } from "@/lib/audit/crawl";
import { isDemo } from "@/lib/audit/demo";
import { FetchError, normalizeUrl } from "@/lib/audit/fetch";
import { auditError, ipHash, toPublic } from "@/lib/audit/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;
const RUNS_PER_HOUR = 10;
/** En färsk körning av samma URL återanvänds — snabbare för besökaren och
 *  skonsamt mot sajten som granskas. */
const CACHE_MS = 24 * HOUR;

/**
 * Publik: ingen session. Startsidan och ett urval undersidor hämtas,
 * kontrolleras och betygssätts. Svaret innehåller betyget och kontrollerna.
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

  const demo = isDemo();
  const sb = demo ? null : getSupabaseAdminClient();
  const url = start.toString();
  const ip = ipHash(request);

  if (sb) {
    const cached = await sb
      .from("audit_runs")
      .select("id, url, host, score, seo_score, geo_score, checks, pages")
      .eq("url", url)
      .gt("created_at", new Date(Date.now() - CACHE_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached.data) return NextResponse.json(toPublic(cached.data));

    const recent = await sb
      .from("audit_runs")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ip)
      .gt("created_at", new Date(Date.now() - HOUR).toISOString());
    if ((recent.count ?? 0) >= RUNS_PER_HOUR) return auditError("RATE_LIMITED", 429);
  }

  let audit;
  try {
    audit = await auditSite(start);
  } catch (err) {
    if (err instanceof FetchError || err instanceof SiteError) return auditError(err.code, 422);
    throw err;
  }

  const scores = score(audit.checks);
  const row = {
    url,
    final_url: audit.finalUrl,
    host: new URL(audit.finalUrl).hostname,
    score: scores.score,
    seo_score: scores.seoScore,
    geo_score: scores.geoScore,
    checks: audit.checks,
    pages: audit.pages,
  };

  if (!sb) {
    return NextResponse.json(toPublic({ id: randomUUID(), ...row }));
  }

  const { data, error } = await sb
    .from("audit_runs")
    .insert({ ...row, ip_hash: ip })
    .select("id, url, host, score, seo_score, geo_score, checks, pages")
    .single();
  if (error || !data) return auditError("SERVER_ERROR", 500);

  return NextResponse.json(toPublic(data));
}
