import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid } from "@/lib/ads/access";
import { cleanTags, requireMember } from "@/lib/ads/assets";
import { ASSET_BUCKET, isAssetSource } from "@/lib/ads/asset-types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string; assetId: string }> };

/** Ändrar beskrivning, taggar och källa. Bara medlemmar i företaget. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const { id, assetId } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;
  if (!isUuid(assetId)) return adsError("ASSET_NOT_FOUND", 404);

  const body = await request.json().catch(() => null);
  const patch: Record<string, unknown> = {};
  if (body?.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 1000) return adsError("INVALID_DESCRIPTION");
    patch.description = body.description.trim();
  }
  if (body?.tags !== undefined) {
    const tags = cleanTags(body.tags);
    if (!tags) return adsError("INVALID_TAGS");
    patch.tags = tags;
  }
  if (body?.source !== undefined) {
    if (!isAssetSource(body.source)) return adsError("INVALID_SOURCE");
    patch.source = body.source;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await getSupabaseAdminClient().from("ad_assets").update(patch).eq("company_id", id).eq("id", assetId).select("description, tags, source");
  if (error) return adsError("SERVER_ERROR", 500);
  if (!data?.length) return adsError("ASSET_NOT_FOUND", 404);
  // Det sparade (trimmat, taggar städade), så att formuläret visar samma sak som databasen.
  return NextResponse.json({ ok: true, asset: data[0] });
}

/** Tar bort tillgången och filen. Bara medlemmar i företaget. */
export async function DELETE(request: NextRequest, { params }: Context) {
  const { id, assetId } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;
  if (!isUuid(assetId)) return adsError("ASSET_NOT_FOUND", 404);

  const sb = getSupabaseAdminClient();
  // Exempelposter försvinner med mallen i databasen, så deras filer hämtas först.
  const { data: children } = await sb.from("ad_assets").select("storage_path").eq("company_id", id).eq("parent_id", assetId);
  const { data, error } = await sb.from("ad_assets").delete().eq("company_id", id).eq("id", assetId).select("storage_path");
  if (error) return adsError("SERVER_ERROR", 500);
  if (!data?.length) return adsError("ASSET_NOT_FOUND", 404);
  const paths = [data[0].storage_path as string, ...(children ?? []).map((c) => c.storage_path as string)];
  await sb.storage.from(ASSET_BUCKET).remove(paths);
  return NextResponse.json({ ok: true });
}
