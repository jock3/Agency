import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runChecks, score } from "@/lib/audit/checks";
import { isDemo, saveDemoRun } from "@/lib/audit/demo";
import { FetchError, normalizeUrl, safeFetch, tryFetch } from "@/lib/audit/fetch";
import { auditError, ipHash, toPublic } from "@/lib/audit/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;
const RUNS_PER_HOUR = 10;
/** En färsk körning av samma URL återanvänds — snabbare för besökaren och
 *  skonsamt mot sajten som granskas. */
const CACHE_MS = 24 * HOUR;

/**
 * Publik: ingen session. Sidan hämtas, kontrolleras och betygssätts. Svaret
 * innehåller betyget och kontrollerna men inte åtgärderna — de kräver e-post
 * och hämtas via /unlock.
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
      .select("id, url, host, score, seo_score, geo_score, checks")
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

  let page;
  try {
    page = await safeFetch(start);
  } catch (err) {
    return auditError(err instanceof FetchError ? err.code : "NETWORK", 422);
  }
  if (page.status >= 400) return auditError("SITE_ERROR", 422);
  const contentType = String(page.headers["content-type"] ?? "");
  if (contentType && !contentType.includes("html")) return auditError("NOT_HTML", 422);

  const origin = new URL(page.url).origin;
  const [robots, llms] = await Promise.all([tryFetch(new URL("/robots.txt", origin)), tryFetch(new URL("/llms.txt", origin))]);
  const robotsTxt = robots?.body ?? null;
  // Sitemap-raden i robots.txt räcker. Annars prövas standardplatsen.
  const hasSitemap = /^\s*sitemap\s*:/im.test(robotsTxt ?? "") || (await tryFetch(new URL("/sitemap.xml", origin))) !== null;
  // Många sajter svarar 200 med sin vanliga HTML-sida på okända sökvägar.
  const hasLlmsTxt = llms !== null && !/^\s*</.test(llms.body);

  const { checks, extract } = runChecks({ url: page.url, html: page.body, ms: page.ms, robotsTxt, hasSitemap, hasLlmsTxt });
  const scores = score(checks);
  const row = {
    url,
    final_url: page.url,
    host: new URL(page.url).hostname,
    score: scores.score,
    seo_score: scores.seoScore,
    geo_score: scores.geoScore,
    checks,
  };

  if (!sb) {
    const id = randomUUID();
    saveDemoRun(id, { finalUrl: page.url, checks, extract });
    return NextResponse.json(toPublic({ id, ...row }));
  }

  const { data, error } = await sb
    .from("audit_runs")
    .insert({ ...row, extract, ip_hash: ip })
    .select("id, url, host, score, seo_score, geo_score, checks")
    .single();
  if (error || !data) return auditError("SERVER_ERROR", 500);

  return NextResponse.json(toPublic(data));
}
