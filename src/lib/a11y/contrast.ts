/**
 * Färgkontrast enligt WCAG 2.2 (1.4.3). Siffrorna räknas här i kod: AI:n
 * föreslår aldrig en färgkod, eftersom en modell inte kan räkna ut kontrast
 * pålitligt (se docs/ai-rules.md).
 */

export interface Contrast {
  fg: string;
  bg: string;
  /** Uppmätt kontrast, som axe rapporterade den. */
  ratio: number;
  /** Kravet: 4,5 för vanlig text, 3 för stor text. */
  expected: number;
}

const HEX6 = /^#[0-9a-f]{6}$/i;

type Rgb = [number, number, number];

const parse = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function ratioOf(fg: string, bg: string): number {
  const a = luminance(parse(fg));
  const b = luminance(parse(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Värden ur den granskade sidan släpps bara igenom om de ser ut som axe:s. */
export function cleanContrast(c: unknown): Contrast | undefined {
  if (!c || typeof c !== "object") return undefined;
  const { fg, bg, ratio, expected } = c as Record<string, unknown>;
  if (typeof fg !== "string" || typeof bg !== "string" || !HEX6.test(fg) || !HEX6.test(bg)) return undefined;
  if (typeof ratio !== "number" || typeof expected !== "number" || !Number.isFinite(ratio) || !(expected >= 3 && expected <= 7)) return undefined;
  return { fg: fg.toLowerCase(), bg: bg.toLowerCase(), ratio, expected };
}

/**
 * Närmaste textfärg som klarar kravet mot samma bakgrund: textfärgen blandas
 * stegvis mot svart eller vitt tills kontrasten räcker, så nyansen bevaras så
 * långt det går. Ger null om ingen av riktningarna når kravet.
 */
export function fixForeground(c: Contrast): { color: string; ratio: number } | null {
  const fg = parse(c.fg);
  const candidates: { color: string; ratio: number; distance: number }[] = [];
  for (const end of [[0, 0, 0], [255, 255, 255]] as Rgb[]) {
    // Minsta blandning mot ändpunkten som räcker, med marginal mot avrundning.
    for (let step = 0; step <= 100; step++) {
      const t = step / 100;
      const mixed = fg.map((v, i) => v + (end[i] - v) * t) as Rgb;
      const color = toHex(mixed);
      const ratio = ratioOf(color, c.bg);
      if (ratio >= c.expected + 0.05) {
        candidates.push({ color, ratio, distance: step });
        break;
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  return { color: candidates[0].color, ratio: Math.round(candidates[0].ratio * 100) / 100 };
}
