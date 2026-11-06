import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adsError } from "@/lib/ads/access";
import { checkParent, quotaLeft, requireMember, storagePath } from "@/lib/ads/assets";
import { ASSET_BUCKET, MAX_ASSET_BYTES, isAssetExt, isAssetKind } from "@/lib/ads/asset-types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/**
 * Signerad uppladdnings-URL för en ny tillgång. Filen går direkt från
 * webbläsaren till storage (Vercel tar emot högst 4,5 MB kropp), och
 * registreras sedan via POST .../assets, som kontrollerar filen.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const ext = body?.ext;
  const bytes = body?.bytes;
  if (!isAssetKind(kind) || !isAssetExt(ext)) return adsError("INVALID_FILE");
  if (kind === "overlay" && ext !== "png") return adsError("OVERLAY_NOT_PNG");
  const parentId = body?.parentId;
  if (typeof bytes !== "number" || bytes <= 0 || bytes > MAX_ASSET_BYTES) return adsError("TOO_LARGE");

  try {
    if (kind === "example") {
      const problem = await checkParent(id, parentId);
      if (problem) return adsError(problem, problem === "TOO_MANY_EXAMPLES" ? 409 : 404);
    }
    if ((await quotaLeft(id)) < bytes) return adsError("QUOTA_FULL", 409);
    const assetId = randomUUID();
    const path = storagePath(id, kind, assetId, ext);
    const { data, error } = await getSupabaseAdminClient().storage.from(ASSET_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "no signed url");
    return NextResponse.json({ assetId, path, token: data.token });
  } catch (err) {
    console.error("ads upload sign", err);
    return adsError("SERVER_ERROR", 500);
  }
}
