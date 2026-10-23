import { NextRequest, NextResponse } from "next/server";
import { toActions } from "@/lib/audit/actions";
import { score } from "@/lib/audit/checks";
import { auditSite, SiteError } from "@/lib/audit/crawl";
import { FetchError, normalizeUrl } from "@/lib/audit/fetch";
import { auditError } from "@/lib/audit/server";

export const maxDuration = 60;

/**
 * Intern, bakom inloggning via proxy. Granskar alltid på nytt, utan cache och
 * gränser, och svarar med betyg och prioriterade åtgärder inklusive fix-texter.
 * Körningen sparas inte, så den hamnar inte bland det publika verktygets leads.
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

  const scores = score(audit.checks);
  return NextResponse.json({
    url: audit.finalUrl,
    seoScore: scores.seoScore,
    geoScore: scores.geoScore,
    pages: audit.pages.length,
    auditedAt: new Date().toISOString(),
    actions: toActions(audit.checks),
  });
}
