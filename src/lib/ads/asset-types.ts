/** Typer och gränser för tillgångar. Ren fil, så att klienten kan läsa den. */

export const ASSET_BUCKET = "ad-assets";
export const MAX_ASSET_BYTES = 15 * 1024 * 1024;
/** Lagringstak per företag tills frågan om lagring är avgjord (handoffens öppna fråga 4). */
export const COMPANY_QUOTA_BYTES = 500 * 1024 * 1024;

export type AssetKind = "photo" | "overlay";
export type AssetExt = "png" | "jpg" | "webp";
export type AssetSource = "generated" | "uploaded_own" | "uploaded_other";

export const isAssetKind = (v: unknown): v is AssetKind => v === "photo" || v === "overlay";
export const isAssetExt = (v: unknown): v is AssetExt => v === "png" || v === "jpg" || v === "webp";
export const isAssetSource = (v: unknown): v is AssetSource => v === "generated" || v === "uploaded_own" || v === "uploaded_other";

export const SOURCE_NAMES: Record<AssetSource, string> = {
  uploaded_own: "Egen bild",
  uploaded_other: "Annans bild",
  generated: "AI-genererad",
};

/** Filändelsen för en vald fil, eller null om typen inte stöds. */
export function extForFile(file: File): AssetExt | null {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} kB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
