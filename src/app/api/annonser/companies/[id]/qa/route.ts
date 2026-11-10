import { NextRequest, NextResponse } from "next/server";
import { adsError } from "@/lib/ads/access";
import { requireMember } from "@/lib/ads/assets";
import { MAX_MESSAGE } from "@/lib/ads/pick";
import { MAX_QA_IMAGE_B64, qaAd } from "@/lib/ads/qa";

export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * QA-granskning av en färdig annons. Bilden komponeras i webbläsaren och
 * skickas hit som JPEG (base64). Bara medlemmar. Ingenting sparas.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE) return adsError("INVALID_MESSAGE");
  const image = typeof body?.image === "string" ? body.image : "";
  // JPEG börjar alltid med FF D8 FF, som i base64 blir "/9j/".
  if (!image || image.length > MAX_QA_IMAGE_B64 || !image.startsWith("/9j/") || !B64.test(image)) return adsError("INVALID_IMAGE");
  const texts = (Array.isArray(body?.texts) ? body.texts : [])
    .filter((t: unknown): t is string => typeof t === "string")
    .slice(0, 10)
    .map((t: string) => t.slice(0, 300));

  const out = await qaAd({ message, imageB64: image, texts, generatedImage: body?.generatedImage === true });
  if ("error" in out) return adsError(out.error, out.error === "AI_DISABLED" ? 503 : 502);
  return NextResponse.json({ ok: true, ...out.result });
}
