import { NextRequest, NextResponse } from "next/server";
import { adsError } from "@/lib/ads/access";
import { listAssets, requireMember } from "@/lib/ads/assets";
import { isFormat, readiness } from "@/lib/ads/layout";
import { MAX_MESSAGE, MAX_PICK_PHOTOS, pickAd, type PickTemplate } from "@/lib/ads/pick";

export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };

/**
 * Claude väljer bild och mall och skriver texten till ett budskap. Bara
 * medlemmar i företaget, och bara företagets egna tillgångar skickas till
 * modellen. Ingenting sparas här: förslaget laddas in i komponeringen.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE) return adsError("INVALID_MESSAGE");
  const format: unknown = body?.format;
  if (!isFormat(format)) return adsError("INVALID_FORMAT");

  const assets = await listAssets(id);
  const photos = assets.filter((a) => a.kind === "photo" && a.url).slice(0, MAX_PICK_PHOTOS);
  const templates: PickTemplate[] = assets
    .filter((a) => a.kind === "overlay" && a.url && a.layout && readiness(a.layout).ready && a.layout.placements[format])
    .map((a) => ({
      asset: a,
      layout: a.layout!,
      examples: assets.filter((e) => e.kind === "example" && e.parent_id === a.id).map((e) => e.description),
    }));

  const out = await pickAd({ message, format, photos, templates });
  if ("error" in out) return adsError(out.error, out.error === "AI_FAILED" ? 502 : out.error === "AI_DISABLED" ? 503 : 422);
  return NextResponse.json({ ok: true, ...out.result });
}
