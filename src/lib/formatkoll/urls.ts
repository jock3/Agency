import { PREVIEW_BUCKET } from "./guard";

/**
 * Publik URL till en uppladdad film. `v` bustar cachen: ersätter man en fil
 * skrivs samma sökväg över, och utan parametern skulle kunden fortsätta se den
 * gamla filmen ur webbläsarens cache.
 */
export function publicAssetUrl(storagePath: string, updatedAt: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const v = Date.parse(updatedAt) || 0;
  return `${base}/storage/v1/object/public/${PREVIEW_BUCKET}/${storagePath}?v=${v}`;
}
