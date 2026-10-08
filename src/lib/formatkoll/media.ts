/**
 * Film eller stillbild. Typen bärs av filändelsen i storage-sökvägen, så den
 * behöver ingen egen kolumn — och rader från innan bilder fanns (alla `.mp4`)
 * blir automatiskt video.
 */
export type MediaKind = "video" | "image";

export const ASSET_EXTS = ["mp4", "jpg", "png"] as const;
export type AssetExt = (typeof ASSET_EXTS)[number];

export const isAssetExt = (v: unknown): v is AssetExt =>
  typeof v === "string" && (ASSET_EXTS as readonly string[]).includes(v);

/** Bara jpg och png släpps in som bild. Video landar alltid på `.mp4` oavsett
 *  om originalet var .mov eller .webm — content-type sätts vid uppladdningen. */
export function extForFile(file: File): AssetExt | null {
  const name = file.name.toLowerCase();
  if (file.type === "image/png" || name.endsWith(".png")) return "png";
  if (file.type === "image/jpeg" || /\.jpe?g$/.test(name)) return "jpg";
  if (file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/.test(name)) return "mp4";
  return null;
}

export function kindOfPath(path: string): MediaKind {
  return /\.(jpe?g|png)$/i.test(path.split("?")[0]) ? "image" : "video";
}

export const ACCEPT = "video/*,image/jpeg,image/png";
