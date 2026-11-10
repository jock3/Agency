import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/control";

/** TILLFÄLLIG felsökning av ANTHROPIC_API_KEY i Vercel. Visar bara form och en kort hash, aldrig nyckeln. Tas bort direkt efter användning. */
const shape = (name: string) => {
  const k = process.env[name] ?? "";
  return {
    set: k.length > 0,
    length: k.length,
    prefix: k.slice(0, 11),
    sha8: createHash("sha256").update(k).digest("hex").slice(0, 8),
    hasQuote: /["']/.test(k),
    hasWhitespace: /\s/.test(k),
  };
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  return NextResponse.json({
    ANTHROPIC_API_KEY: shape("ANTHROPIC_API_KEY"),
    ARTCRAFT_API_KEY: shape("ARTCRAFT_API_KEY"),
    otherAnthropicVars: Object.keys(process.env).filter((n) => n.startsWith("ANTHROPIC_") && n !== "ANTHROPIC_API_KEY"),
  });
}
