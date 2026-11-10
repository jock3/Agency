import { FORMAT_SIZE, type AdFormat, type TemplateLayout, type TextZone } from "./layout";

/**
 * Komponering (steg 4): foto + mall + text blir en PNG på canvas. Körs i
 * webbläsaren. AI:n renderar aldrig text: all text läggs på här, med REM.
 * Texten krymps tills den ryms i textytan; ryms den inte ens på minsta storlek
 * flaggas ytan, så att anroparen kan varna i stället för att tyst klippa.
 */

/** Minsta textstorlek i pixlar (annonsen är 1080 bred). Under det är text oläsbar i flödet. */
export const MIN_FONT_PX = 22;
/** Under det här (i en 1080 bred bild, ungefär 16 pt på en telefon) varnar vi för att texten blivit liten. */
export const READABLE_FONT_PX = 44;
const LINE_HEIGHT = 1.15;

export interface FitResult {
  lines: string[];
  fontSize: number;
  /** Ryms hela texten i ytan på den storleken? */
  fits: boolean;
}

type Measure = Pick<CanvasRenderingContext2D, "measureText" | "font">;

/** Bryter text i rader som ryms i `maxW`. Ord som är bredare än raden bryts mellan tecken. */
export function wrapLines(ctx: Measure, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    const push = () => {
      if (line) lines.push(line);
      line = "";
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxW) {
        line = candidate;
        continue;
      }
      push();
      if (ctx.measureText(word).width <= maxW) {
        line = word;
        continue;
      }
      for (const ch of word) {
        if (line && ctx.measureText(line + ch).width > maxW) push();
        line += ch;
      }
    }
    push();
  }
  return lines;
}

/** Största storlek (men minst `min`) där texten ryms i boxen. */
export function fitText(
  ctx: Measure,
  text: string,
  fontFor: (size: number) => string,
  boxW: number,
  boxH: number,
  max = 240,
  min = MIN_FONT_PX,
): FitResult {
  const attempt = (size: number): FitResult => {
    ctx.font = fontFor(size);
    const lines = wrapLines(ctx, text, boxW);
    const widest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
    return { lines, fontSize: size, fits: lines.length * size * LINE_HEIGHT <= boxH && widest <= boxW + 0.5 };
  };
  let lo = min;
  let hi = Math.max(min, Math.min(max, Math.floor(boxH)));
  let best = attempt(lo);
  if (!best.fits) return best;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const r = attempt(mid);
    if (r.fits) {
      best = r;
      lo = mid;
    } else hi = mid - 1;
  }
  return best;
}

export interface ZoneReport {
  id: string;
  /** Texten ryms i ytan. Falskt betyder att den rinner över även på minsta storlek. */
  fits: boolean;
  fontSize: number;
  /** Texten ryms men har krympts under READABLE_FONT_PX. */
  small: boolean;
}

export interface ComposeInput {
  format: AdFormat;
  photo: HTMLImageElement;
  template: HTMLImageElement;
  layout: TemplateLayout;
  /** Text per textyta (id → text). */
  texts: Record<string, string>;
  /** CSS font-family, till exempel värdet av --font-rem. */
  fontFamily: string;
}

/** Ritar annonsen på canvasen och returnerar en rapport per textyta. */
export function composeAd(canvas: HTMLCanvasElement, input: ComposeInput): ZoneReport[] {
  const { format, photo, template, layout, texts, fontFamily } = input;
  const size = FORMAT_SIZE[format];
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("NO_CANVAS");

  // Fotot fyller bilden (beskärs i mitten).
  const scale = Math.max(size.w / photo.naturalWidth, size.h / photo.naturalHeight);
  const pw = photo.naturalWidth * scale, ph = photo.naturalHeight * scale;
  ctx.drawImage(photo, (size.w - pw) / 2, (size.h - ph) / 2, pw, ph);

  const placement = layout.placements[format];
  if (!placement) return [];
  const aspect = template.naturalWidth / template.naturalHeight;
  const tw = placement.w * size.w;
  const th = tw / aspect;
  const ox = placement.x * size.w, oy = placement.y * size.h;
  ctx.drawImage(template, ox, oy, tw, th);

  const reports: ZoneReport[] = [];
  for (const zone of layout.zones) {
    const raw = (texts[zone.id] ?? "").trim();
    if (!raw) continue;
    reports.push(drawZone(ctx, zone, raw, { ox, oy, tw, th }, fontFamily));
  }
  return reports;
}

function drawZone(
  ctx: CanvasRenderingContext2D,
  zone: TextZone,
  raw: string,
  t: { ox: number; oy: number; tw: number; th: number },
  fontFamily: string,
): ZoneReport {
  const text = zone.uppercase ? raw.toLocaleUpperCase("sv") : raw;
  const boxW = zone.w * t.tw, boxH = zone.h * t.th;
  const cx = t.ox + (zone.x + zone.w / 2) * t.tw, cy = t.oy + (zone.y + zone.h / 2) * t.th;
  const fit = fitText(ctx, text, (s) => `${zone.weight} ${s}px ${fontFamily}`, boxW, boxH);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((zone.rotation * Math.PI) / 180);
  ctx.font = `${zone.weight} ${fit.fontSize}px ${fontFamily}`;
  ctx.fillStyle = zone.color;
  ctx.textBaseline = "middle";
  ctx.textAlign = zone.align;
  const lineH = fit.fontSize * LINE_HEIGHT;
  const blockH = fit.lines.length * lineH;
  const top = zone.valign === "top" ? -boxH / 2 : zone.valign === "bottom" ? boxH / 2 - blockH : -blockH / 2;
  const x = zone.align === "left" ? -boxW / 2 : zone.align === "right" ? boxW / 2 : 0;
  fit.lines.forEach((line, i) => ctx.fillText(line, x, top + lineH * (i + 0.5)));
  ctx.restore();

  return { id: zone.id, fits: fit.fits, fontSize: fit.fontSize, small: fit.fontSize < READABLE_FONT_PX };
}

// ---------- webbläsarhjälpare ----------

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Laddar en bild så att canvasen inte blir "tainted" (signerade URL:er skickar CORS-huvuden). */
export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(url);
        reject(new Error("IMAGE_LOAD"));
      };
      img.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}

/** Ser till att REM är nedladdad i alla vikter som mallarna kan använda innan något ritas. */
export async function ensureFont(fontFamily: string): Promise<void> {
  await Promise.all([400, 700, 800].map((w) => document.fonts.load(`${w} 48px ${fontFamily}`, "ÅÄÖåäö Aa")));
  await document.fonts.ready;
}

/** REM:s riktiga family-namn från next/font, via CSS-variabeln på <html>. */
export function remFontFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-rem").trim();
  return v ? `${v}, sans-serif` : "sans-serif";
}
