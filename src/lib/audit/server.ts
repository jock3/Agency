import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { AuditedPage, Check, PublicAuditResult } from "./types";

export const auditError = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

/** Vercel sätter x-forwarded-for; första adressen är klienten. Hashas direkt
 *  så ingen IP-adress hamnar i databasen. */
export function ipHash(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

interface RunRow {
  id: string;
  url: string;
  host: string;
  score: number;
  seo_score: number;
  geo_score: number;
  checks: Check[];
  /** Null på körningar från före flersidesgranskningen. */
  pages: AuditedPage[] | null;
}

/** Betygen och de granskade sidorna lämnar servern. Kontrollerna med vad som är fel stannar kvar. */
export function toPublic(row: RunRow): PublicAuditResult {
  return {
    id: row.id,
    url: row.url,
    host: row.host,
    score: row.score,
    seoScore: row.seo_score,
    geoScore: row.geo_score,
    pages: (row.pages ?? []).map(({ url, title, status, issues }) => ({ url, title, status, issues })),
  };
}
