import { NextRequest, NextResponse } from "next/server";
import { adsError } from "@/lib/ads/access";
import { listAssets, requireMember } from "@/lib/ads/assets";
import { artcraftEnabled } from "@/lib/ads/artcraft";
import { isFormat, readiness } from "@/lib/ads/layout";
import { MAX_MESSAGE, MAX_PICK_PHOTOS, pickAd, type PickFeedback, type PickTemplate } from "@/lib/ads/pick";

export const maxDuration = 120;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Omtag från det automatiska flödet: förra valet och QA:s anmärkningar. Okända fält ignoreras. */
function readFeedback(v: unknown): PickFeedback | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const issues = (Array.isArray(o.issues) ? o.issues : []).map((i) => str(i, 300).trim()).filter(Boolean).slice(0, 10);
  if (issues.length === 0) return undefined;
  const texts: Record<string, string> = {};
  if (o.texts && typeof o.texts === "object")
    for (const [k, t] of Object.entries(o.texts as Record<string, unknown>).slice(0, 20)) texts[str(k, 60)] = str(t, 300);
  return { photoId: str(o.photoId, 60) || null, templateId: str(o.templateId, 60), texts, issues };
}

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

  const allowNew = body?.allowNew === true && artcraftEnabled();
  const out = await pickAd({ message, format, photos, templates, allowNew, feedback: readFeedback(body?.feedback) });
  if ("error" in out) return adsError(out.error, out.error === "AI_FAILED" ? 502 : out.error === "AI_DISABLED" ? 503 : 422);
  return NextResponse.json({ ok: true, ...out.result });
}
