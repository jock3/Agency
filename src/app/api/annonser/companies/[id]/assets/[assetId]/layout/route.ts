import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid } from "@/lib/ads/access";
import { requireMember } from "@/lib/ads/assets";
import { parseLayout } from "@/lib/ads/layout";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string; assetId: string }> };

/**
 * Sparar mallens layout (textytor och placering per format) i ett enda
 * skrivande. Layouten valideras på servern med samma regler som editorn
 * räknar med, och sparas bara på en mall som tillhör företaget.
 */
export async function PUT(request: NextRequest, { params }: Context) {
  const { id, assetId } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;
  if (!isUuid(assetId)) return adsError("ASSET_NOT_FOUND", 404);

  const body = await request.json().catch(() => null);
  const layout = parseLayout(body?.layout);
  if (!layout) return adsError("INVALID_LAYOUT");

  const { data, error } = await getSupabaseAdminClient()
    .from("ad_assets")
    .update({ layout })
    .eq("company_id", id)
    .eq("id", assetId)
    .eq("kind", "overlay")
    .select("layout");
  if (error) return adsError("SERVER_ERROR", 500);
  if (!data?.length) return adsError("ASSET_NOT_FOUND", 404);
  return NextResponse.json({ ok: true, layout: data[0].layout });
}
