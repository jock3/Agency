import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid } from "@/lib/ads/access";
import { checkParent, listAssets, mimeOf, quotaLeft, requireMember, sniffExt, storagePath } from "@/lib/ads/assets";
import { ASSET_BUCKET, MAX_ASSET_BYTES, isAssetExt, isAssetKind, isAssetSource } from "@/lib/ads/asset-types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/** Företagets tillgångar. Bara medlemmar. */
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ assets: await listAssets(id) });
}

const dim = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 && v < 100_000 ? v : null);

/**
 * Registrerar en uppladdad fil. Sökvägen räknas fram här ur företaget och
 * id:t, så att ingen kan registrera en fil i ett annat företags mapp. Filen
 * hämtas och kontrolleras: storlek, verklig filtyp och lagringstak. Klarar den
 * inte kontrollen tas den bort ur storage.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const { assetId, kind, ext } = body ?? {};
  if (!isUuid(assetId) || !isAssetKind(kind) || !isAssetExt(ext)) return adsError("INVALID_FILE");
  const parentId = kind === "example" ? body?.parentId : null;
  const source = isAssetSource(body?.source) ? body.source : "uploaded_own";
  const filename = typeof body?.filename === "string" ? body.filename.slice(0, 200) : "";

  const sb = getSupabaseAdminClient();
  const bucket = sb.storage.from(ASSET_BUCKET);
  const path = storagePath(id, kind, assetId, ext);
  const reject = async (code: string, status = 400) => {
    await bucket.remove([path]);
    return adsError(code, status);
  };

  try {
    if (kind === "example") {
      const problem = await checkParent(id, parentId);
      if (problem) return reject(problem, problem === "TOO_MANY_EXAMPLES" ? 409 : 404);
    }
    const { data: blob, error } = await bucket.download(path);
    if (error || !blob) return adsError("UPLOAD_MISSING", 404);
    if (blob.size > MAX_ASSET_BYTES) return reject("TOO_LARGE");
    const real = sniffExt(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
    if (real !== ext) return reject("INVALID_FILE");
    if (kind === "overlay" && real !== "png") return reject("OVERLAY_NOT_PNG");
    if ((await quotaLeft(id)) < blob.size) return reject("QUOTA_FULL", 409);

    const { error: insertError } = await sb.from("ad_assets").insert({
      id: assetId,
      company_id: id,
      kind,
      storage_path: path,
      filename,
      mime: mimeOf(real),
      bytes: blob.size,
      width: dim(body?.width),
      height: dim(body?.height),
      source,
      parent_id: parentId,
      created_by: auth.user.user_id,
    });
    // Samma fil registrerad två gånger: raden finns redan, inget fel.
    if (insertError && insertError.code !== "23505") throw new Error(insertError.message);

    // Flera filer registreras samtidigt och förhandskontrollen ovan ser då inte
    // varandra. Räkna därför igen när raden finns, och backa om taket passerats.
    if (kind === "example" && !insertError && (await checkParent(id, parentId, true))) {
      await sb.from("ad_assets").delete().eq("company_id", id).eq("id", assetId);
      return reject("TOO_MANY_EXAMPLES", 409);
    }
    return NextResponse.json({ ok: true, id: assetId });
  } catch (err) {
    console.error("ads asset register", err);
    return adsError("SERVER_ERROR", 500);
  }
}
