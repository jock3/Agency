import { NextRequest, NextResponse } from "next/server";
import { adsError } from "@/lib/ads/access";
import { mimeOf, quotaLeft, requireMember, sniffExt, storagePath } from "@/lib/ads/assets";
import { ASSET_BUCKET, MAX_ASSET_BYTES } from "@/lib/ads/asset-types";
import { JOB_TOKEN, downloadImage, jobState, pngSize } from "@/lib/ads/artcraft";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string; token: string }> };

/**
 * Frågar var jobbet står. När det är klart hämtas bilden, kontrolleras (verklig
 * filtyp, storlek, lagringstak) och sparas i företagets bildbank som en
 * genererad bild. Att fråga igen efter att bilden sparats ger samma bild, inte
 * en ny: filnamnet bär jobb-id:t.
 */
export async function GET(request: NextRequest, { params }: Context) {
  const { id, token } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;
  if (!JOB_TOKEN.test(token)) return adsError("GEN_NOT_FOUND", 404);
  const description = (request.nextUrl.searchParams.get("prompt") ?? "").trim().slice(0, 500);

  const sb = getSupabaseAdminClient();
  const bucket = sb.storage.from(ASSET_BUCKET);
  const view = async (path: string, assetId: string) => {
    const { data } = await bucket.createSignedUrl(path, 3600);
    return NextResponse.json({ state: "done", asset: { id: assetId, url: data?.signedUrl ?? null, label: description || "AI-genererad bild" } });
  };

  try {
    // Redan sparad: samma bild igen.
    const { data: existing } = await sb.from("ad_assets").select("id, storage_path").eq("company_id", id).like("filename", `artcraft-${token}.%`).maybeSingle();
    if (existing) return view(existing.storage_path as string, existing.id as string);

    const st = await jobState(token);
    if ("error" in st) return adsError(st.error, st.error === "ARTCRAFT_DISABLED" ? 503 : 502);
    if (st.state === "running") return NextResponse.json({ state: "running", progress: st.progress });
    if (st.state === "failed") return NextResponse.json({ state: "failed" });

    const bytes = await downloadImage(st.cdnUrl, MAX_ASSET_BYTES);
    if (bytes === "TOO_LARGE") return adsError("TOO_LARGE", 413);
    if (!bytes) return adsError("GEN_IMPORT_FAILED", 502);
    const ext = sniffExt(new Uint8Array(bytes.subarray(0, 16)));
    if (!ext) return adsError("INVALID_FILE");
    if ((await quotaLeft(id)) < bytes.length) return adsError("QUOTA_FULL", 409);

    const assetId = crypto.randomUUID();
    const path = storagePath(id, "photo", assetId, ext);
    const up = await bucket.upload(path, bytes, { contentType: mimeOf(ext), upsert: false });
    if (up.error) throw new Error(up.error.message);
    const size = ext === "png" ? pngSize(bytes) : null;
    const { error } = await sb.from("ad_assets").insert({
      id: assetId,
      company_id: id,
      kind: "photo",
      storage_path: path,
      filename: `artcraft-${token}.${ext}`,
      mime: mimeOf(ext),
      bytes: bytes.length,
      width: size?.width ?? null,
      height: size?.height ?? null,
      description,
      tags: ["ai-genererad"],
      source: "generated",
      created_by: auth.user.user_id,
    });
    if (error) {
      await bucket.remove([path]);
      throw new Error(error.message);
    }
    console.log(`ads-generate klar company=${id} bytes=${bytes.length}`);
    return view(path, assetId);
  } catch (err) {
    console.error("ads generate poll", err);
    return adsError("SERVER_ERROR", 500);
  }
}
