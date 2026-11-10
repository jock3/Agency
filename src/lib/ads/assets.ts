import { NextRequest, NextResponse } from "next/server";
import type { ValidatedUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { adsError, isUuid, memberCompany, userFromRequest, type Company } from "./access";
import type { TemplateLayout } from "./layout";
import { ASSET_BUCKET, COMPANY_QUOTA_BYTES, MAX_ASSET_BYTES, MAX_EXAMPLES_PER_TEMPLATE, type AssetExt, type AssetKind, type AssetSource } from "./asset-types";

/**
 * Tillgångar i annonsverktyget (steg 2): bilder och PNG-mallar per företag.
 * Allt här körs efter `requireMember`, och varje fråga filtrerar på company_id.
 */

export interface AssetRow {
  id: string;
  kind: AssetKind;
  storage_path: string;
  filename: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  description: string;
  tags: string[];
  source: AssetSource;
  /** För exempelposter: mallen de hör till. */
  parent_id: string | null;
  /** Mallens textytor och placering per format (steg 3). Bara mallar har en. */
  layout: TemplateLayout | null;
  created_at: string;
}

export interface AssetView extends AssetRow {
  /** Signerad URL, giltig en timme. */
  url: string | null;
}

/** Inloggad medlem i företaget, eller ett felsvar. Icke-medlem och okänt id ger samma 404. */
export async function requireMember(
  request: NextRequest,
  companyId: string,
): Promise<{ user: ValidatedUser; company: Company } | { response: NextResponse }> {
  const user = await userFromRequest(request);
  if (!user) return { response: adsError("UNAUTHORIZED", 401) };
  const company = await memberCompany(user.user_id, companyId);
  if (!company) return { response: adsError("NOT_FOUND", 404) };
  return { user, company };
}

export const storagePath = (companyId: string, kind: AssetKind, id: string, ext: AssetExt) => `${companyId}/${kind}/${id}.${ext}`;

const MIME_OF: Record<AssetExt, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
export const mimeOf = (ext: AssetExt) => MIME_OF[ext];

/** Filtypen enligt filens första byte, oavsett vad filnamnet påstår. */
export function sniffExt(head: Uint8Array): AssetExt | null {
  const at = (i: number, ...bytes: number[]) => bytes.every((b, j) => head[i + j] === b);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  return null;
}

/**
 * Kontrollerar att en exempelpost får läggas på mallen: mallen finns, tillhör
 * företaget och är en mall, och har plats för fler exempel. Returnerar felkod
 * eller null.
 */
export async function checkParent(
  companyId: string,
  parentId: unknown,
  /** Efter att exemplet lagts in: då räknas det själv med, och taket är passerat först när det blivit för många. */
  inserted = false,
): Promise<"PARENT_NOT_FOUND" | "TOO_MANY_EXAMPLES" | null> {
  if (!isUuid(parentId)) return "PARENT_NOT_FOUND";
  const sb = getSupabaseAdminClient();
  const { data: parent, error } = await sb.from("ad_assets").select("id").eq("id", parentId).eq("company_id", companyId).eq("kind", "overlay").maybeSingle();
  if (error) throw new Error(error.message);
  if (!parent) return "PARENT_NOT_FOUND";
  const { count, error: countError } = await sb.from("ad_assets").select("id", { count: "exact", head: true }).eq("parent_id", parentId);
  if (countError) throw new Error(countError.message);
  return (count ?? 0) >= MAX_EXAMPLES_PER_TEMPLATE + (inserted ? 1 : 0) ? "TOO_MANY_EXAMPLES" : null;
}

/** Hur många byte företaget redan använder. */
export async function usedBytes(companyId: string): Promise<number> {
  const { data, error } = await getSupabaseAdminClient().from("ad_assets").select("bytes").eq("company_id", companyId);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, r) => sum + (r.bytes as number), 0);
}

export const quotaLeft = async (companyId: string) => COMPANY_QUOTA_BYTES - (await usedBytes(companyId));

/** Företagets tillgångar, nyast först, med signerade URL:er. */
export async function listAssets(companyId: string): Promise<AssetView[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("ad_assets")
    .select("id, kind, storage_path, filename, mime, bytes, width, height, description, tags, source, parent_id, layout, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as AssetRow[];
  if (rows.length === 0) return [];
  const { data: signed } = await sb.storage.from(ASSET_BUCKET).createSignedUrls(
    rows.map((r) => r.storage_path),
    3600,
  );
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, url: urlOf.get(r.storage_path) ?? null }));
}

/** Taggar: gemener, trimmade, unika, högst 20 stycken på högst 40 tecken. */
export function cleanTags(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const out: string[] = [];
  for (const t of input) {
    if (typeof t !== "string") return null;
    const tag = t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 20);
}

export { MAX_ASSET_BYTES };
