import { NextRequest, NextResponse } from "next/server";
import { adsError } from "@/lib/ads/access";
import { quotaLeft, requireMember } from "@/lib/ads/assets";
import { MAX_ASSET_BYTES } from "@/lib/ads/asset-types";
import { artcraftEnabled, startImage } from "@/lib/ads/artcraft";
import { isFormat } from "@/lib/ads/layout";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

const MAX_PROMPT = 500;
/** Högst så många genererade bilder per företag och dygn, räknat på bilder som sparats i banken. Skyddar ArtCrafts krediter. */
const DAILY_GENERATED_CAP = 10;

/** Startar en bildgenerering hos ArtCraft. Bara medlemmar. Svaret är ett jobb-id som klienten frågar om. */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT) return adsError("INVALID_PROMPT");
  const format: unknown = body?.format;
  if (!isFormat(format)) return adsError("INVALID_FORMAT");
  if (!artcraftEnabled()) return adsError("ARTCRAFT_DISABLED", 503);

  try {
    if ((await quotaLeft(id)) < MAX_ASSET_BYTES) return adsError("QUOTA_FULL", 409);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error } = await getSupabaseAdminClient()
      .from("ad_assets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id)
      .eq("source", "generated")
      .gte("created_at", since.toISOString());
    if (error) throw new Error(error.message);
    if ((count ?? 0) >= DAILY_GENERATED_CAP) return adsError("DAILY_CAP", 429);
  } catch (err) {
    console.error("ads generate precheck", err);
    return adsError("SERVER_ERROR", 500);
  }

  const out = await startImage(prompt, format);
  if ("error" in out) return adsError(out.error, out.error === "ARTCRAFT_DISABLED" ? 503 : out.error === "ARTCRAFT_PAYMENT" ? 402 : 502);
  console.log(`ads-generate start company=${id} format=${format} job=${out.token.slice(0, 9)}…`);
  return NextResponse.json({ ok: true, token: out.token });
}
