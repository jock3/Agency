import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/control";

/** TILLFÄLLIG felsökning av ANTHROPIC_API_KEY i Vercel. Visar bara form och en kort hash, aldrig nyckeln. Tas bort direkt efter användning. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const k = process.env.ANTHROPIC_API_KEY ?? "";
  return NextResponse.json({
    set: k.length > 0,
    length: k.length,
    prefix: k.slice(0, 11),
    sha8: createHash("sha256").update(k).digest("hex").slice(0, 8),
    hasQuote: /["']/.test(k),
    hasWhitespace: /\s/.test(k),
    otherAnthropicVars: Object.keys(process.env).filter((n) => n.startsWith("ANTHROPIC_") && n !== "ANTHROPIC_API_KEY"),
  });
}
