import { PLACEMENTS } from "@/lib/formatkoll/placements";

/**
 * Layouten för en mall (steg 3): textytorna på mallen och var mallen ligger i
 * varje format. Ren fil utan server-kod, så att servern validerar med samma
 * regler som editorn räknar med.
 *
 * Koordinater är andelar (0 till 1):
 *  - textyta: x, y, w, h är andelar av mallens egen bredd och höjd, och ytan
 *    roteras runt sin mittpunkt. Då följer ytorna med när mallen flyttas eller skalas.
 *  - placering: x, y är mallens övre vänstra hörn som andel av bildens bredd och
 *    höjd, w är mallens bredd som andel av bildens bredd. Höjden följer mallens proportioner.
 */

export const FORMATS = ["1:1", "4:5", "9:16"] as const;
export type AdFormat = (typeof FORMATS)[number];

/** Bildens storlek i pixlar per format. Samma siffror som annonsen exporteras i. */
export const FORMAT_SIZE: Record<AdFormat, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
};

export const isFormat = (v: unknown): v is AdFormat => (FORMATS as readonly string[]).includes(v as string);

export const ROLES = ["rubrik", "undertext", "etikett"] as const;
export type ZoneRole = (typeof ROLES)[number];
export const ROLE_NAMES: Record<ZoneRole, string> = { rubrik: "Rubrik", undertext: "Undertext", etikett: "Etikett" };

export const ALIGNS = ["left", "center", "right"] as const;
export const VALIGNS = ["top", "middle", "bottom"] as const;
export const WEIGHTS = [400, 700, 800] as const;

export const MAX_ZONES = 4;
export const MAX_CHARS_LIMIT = 200;

export interface TextZone {
  id: string;
  role: ZoneRole;
  /** Fritext till AI:n om vad som ska stå här, till exempel "Personens namn". */
  hint: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Grader, medurs, runt ytans mittpunkt. */
  rotation: number;
  align: (typeof ALIGNS)[number];
  valign: (typeof VALIGNS)[number];
  maxChars: number;
  /** #RRGGBB */
  color: string;
  weight: (typeof WEIGHTS)[number];
  uppercase: boolean;
  /** Ytan ligger mot en enfärgad botten på mallen, så att kontrasten är säker. */
  solidBg: boolean;
}

export interface Placement {
  x: number;
  y: number;
  w: number;
}

export interface TemplateLayout {
  version: 1;
  zones: TextZone[];
  placements: Partial<Record<AdFormat, Placement>>;
}

export const emptyLayout = (): TemplateLayout => ({ version: 1, zones: [], placements: {} });

/** Mallen kan väljas av AI:n i ett format bara om den har textytor med teckengräns och en placering där. */
export function readiness(layout: TemplateLayout | null): { zones: number; formats: AdFormat[]; ready: boolean } {
  if (!layout) return { zones: 0, formats: [], ready: false };
  const formats = FORMATS.filter((f) => layout.placements[f]);
  return { zones: layout.zones.length, formats, ready: layout.zones.length > 0 && formats.length > 0 };
}

// ---------- validering ----------

const round = (n: number) => Math.round(n * 10000) / 10000;
const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? round(v) : null;
const oneOf = <T extends string | number>(list: readonly T[], v: unknown): T | null => (list.includes(v as T) ? (v as T) : null);

/** Rensar och kontrollerar en layout från klienten. null om något inte stämmer. */
export function parseLayout(input: unknown): TemplateLayout | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { version?: unknown; zones?: unknown; placements?: unknown };
  if (raw.version !== 1 || !Array.isArray(raw.zones) || raw.zones.length > MAX_ZONES) return null;
  if (!raw.placements || typeof raw.placements !== "object" || Array.isArray(raw.placements)) return null;

  const zones: TextZone[] = [];
  const seen = new Set<string>();
  for (const z of raw.zones as Record<string, unknown>[]) {
    if (!z || typeof z !== "object") return null;
    const id = typeof z.id === "string" && /^[\w-]{1,40}$/.test(z.id) && !seen.has(z.id) ? z.id : null;
    const role = oneOf(ROLES, z.role);
    const align = oneOf(ALIGNS, z.align);
    const valign = oneOf(VALIGNS, z.valign);
    const weight = oneOf(WEIGHTS, z.weight);
    const x = num(z.x, 0, 1), y = num(z.y, 0, 1), w = num(z.w, 0.02, 1), h = num(z.h, 0.02, 1);
    const rotation = num(z.rotation, -180, 180);
    const maxChars = typeof z.maxChars === "number" && Number.isInteger(z.maxChars) && z.maxChars >= 1 && z.maxChars <= MAX_CHARS_LIMIT ? z.maxChars : null;
    const color = typeof z.color === "string" && /^#[0-9a-f]{6}$/i.test(z.color) ? z.color.toUpperCase() : null;
    const hint = typeof z.hint === "string" && z.hint.length <= 80 ? z.hint.trim() : null;
    if (!id || !role || !align || !valign || !weight || x === null || y === null || w === null || h === null) return null;
    if (rotation === null || maxChars === null || !color || hint === null) return null;
    if (typeof z.uppercase !== "boolean" || typeof z.solidBg !== "boolean") return null;
    seen.add(id);
    zones.push({ id, role, hint, x, y, w, h, rotation, align, valign, maxChars, color, weight, uppercase: z.uppercase, solidBg: z.solidBg });
  }

  const placements: Partial<Record<AdFormat, Placement>> = {};
  for (const [key, p] of Object.entries(raw.placements as Record<string, unknown>)) {
    if (!isFormat(key) || !p || typeof p !== "object") return null;
    const { x: px, y: py, w: pw } = p as Record<string, unknown>;
    const x = num(px, -0.5, 1), y = num(py, -0.5, 1), w = num(pw, 0.1, 1.5);
    if (x === null || y === null || w === null) return null;
    placements[key] = { x, y, w };
  }
  return { version: 1, zones, placements };
}

// ---------- skyddszoner och geometri ----------

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Skyddszon per format, i procent av bilden. Helskärmsformatet 9:16 tar den
 * mest konservativa kanten av Reels, Stories och TikTok, så att texten klarar
 * alla tre. 1:1 och 4:5 ligger i flödet utan gränssnitt över bilden.
 * Riktvärden, hämtade ur formatkollens PLACEMENTS: ändra där.
 */
export function safeInsets(format: AdFormat): SafeInsets {
  if (format !== "9:16") return { top: 0, right: 0, bottom: 0, left: 0 };
  const ids = ["ig-reels", "ig-stories", "tiktok"];
  const list = PLACEMENTS.filter((p) => ids.includes(p.id)).map((p) => p.safe);
  const max = (k: keyof SafeInsets) => Math.max(...list.map((s) => s[k]));
  return { top: max("top"), right: max("right"), bottom: max("bottom"), left: max("left") };
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Hörnen av en roterad rektangel (cx, cy = mittpunkt, i valfri enhet). */
export function rotatedCorners(cx: number, cy: number, w: number, h: number, deg: number): [number, number][] {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const dx = (sx * w) / 2, dy = (sy * h) / 2;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos] as [number, number];
  });
}

/** Textytans yttre ram i bildens pixlar, för mallen placerad i formatet. */
export function zoneBoundsOnCanvas(zone: TextZone, placement: Placement, format: AdFormat, templateAspect: number): Box {
  const size = FORMAT_SIZE[format];
  const tw = placement.w * size.w;
  const th = tw / templateAspect;
  const ox = placement.x * size.w, oy = placement.y * size.h;
  const corners = rotatedCorners(ox + (zone.x + zone.w / 2) * tw, oy + (zone.y + zone.h / 2) * th, zone.w * tw, zone.h * th, zone.rotation);
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

/** Varningar på svenska när en textyta hamnar utanför bilden eller under plattformens gränssnitt. */
export function placementWarnings(layout: TemplateLayout, format: AdFormat, templateAspect: number): string[] {
  const placement = layout.placements[format];
  if (!placement) return [];
  const size = FORMAT_SIZE[format];
  const safe = safeInsets(format);
  const area = {
    left: (safe.left / 100) * size.w,
    right: size.w - (safe.right / 100) * size.w,
    top: (safe.top / 100) * size.h,
    bottom: size.h - (safe.bottom / 100) * size.h,
  };
  const out: string[] = [];
  layout.zones.forEach((zone, i) => {
    const name = `${ROLE_NAMES[zone.role]} (yta ${i + 1})`;
    const b = zoneBoundsOnCanvas(zone, placement, format, templateAspect);
    if (b.left < 0 || b.top < 0 || b.right > size.w || b.bottom > size.h) out.push(`${name} ligger utanför bilden.`);
    else if (b.left < area.left || b.top < area.top || b.right > area.right || b.bottom > area.bottom) {
      out.push(`${name} ligger i plattformens gränssnitt (skyddszonen) och kan skymmas.`);
    }
  });
  return out;
}

/** Startvärden för en ny textyta: en bred yta i mitten av mallen. */
export function newZone(role: ZoneRole = "rubrik"): TextZone {
  return {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2)).slice(0, 36),
    role,
    hint: "",
    x: 0.1,
    y: 0.3,
    w: 0.8,
    h: 0.4,
    rotation: 0,
    align: "center",
    valign: "middle",
    maxChars: role === "rubrik" ? 40 : 60,
    color: "#FFFFFF",
    weight: 800,
    uppercase: false,
    solidBg: true,
  };
}

/** Förslag på placering: mallen i bredd 90 % av bilden, nedtill. */
export function defaultPlacement(format: AdFormat, templateAspect: number): Placement {
  const size = FORMAT_SIZE[format];
  const w = 0.9;
  const hFrac = (w * size.w) / templateAspect / size.h;
  return { x: round((1 - w) / 2), y: round(Math.max(0, 0.9 - hFrac)), w };
}
