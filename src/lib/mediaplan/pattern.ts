/**
 * Projektets mönster: 16 rutor (4 × 4) med bakgrund, form och förgrund.
 * Samma beräkning som i designen: FNV-1a hashar ett frö som matar
 * slumpgeneratorn mulberry32. Listornas ordning får inte ändras, då ändras
 * alla mönster.
 */

export type ColorName = "red" | "alcazar" | "tintin" | "rackham" | "roberto" | "haddock" | "white";
export type ShapeName = "circle" | "q-tl" | "q-tr" | "q-bl" | "q-br" | "half-t" | "half-b" | "square" | "ring" | "none";

export interface PatternCell { bg: ColorName; fg: ColorName; shape: ShapeName }

/** Milous färger med exakta värden (handoffens palett). */
export const HEX: Record<ColorName, string> = {
  red: "#E60330",
  alcazar: "#FCBEB7",
  tintin: "#FFDED0",
  rackham: "#FF999C",
  roberto: "#931644",
  haddock: "#1C1C1C",
  white: "#FFFFFF",
};

const BG: ColorName[] = ["tintin", "tintin", "alcazar", "white", "white", "red", "rackham", "haddock"];
const FG: ColorName[] = ["red", "red", "roberto", "alcazar", "haddock", "tintin", "rackham", "white"];
const SHAPES: ShapeName[] = ["circle", "circle", "q-tl", "q-tr", "q-bl", "q-br", "half-t", "half-b", "square", "ring", "none"];

export function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mönstret för ett projekt. `round` är antalet gånger det blandats. */
export function projectPattern(projectId: string, round = 0): PatternCell[] {
  const r = mulberry32((fnv1a(projectId) + round * 7919) | 0);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
  const out: PatternCell[] = [];
  for (let i = 0; i < 16; i++) {
    const bg = pick(BG);
    let fg = pick(FG);
    for (let g = 0; fg === bg && g < 6; g++) fg = pick(FG);
    out.push({ bg, fg, shape: pick(SHAPES) });
  }
  return out;
}

// ---- Kund och kampanj: färger och initialer ----

const CLIENT_ACCENTS: ColorName[] = ["alcazar", "tintin", "rackham"];
/** Kundens färg från dess plats i skapandeordningen (0 = äldst): Alcazar, Tintin, Rackham och sedan om. */
export const clientAccent = (rank: number): ColorName => CLIENT_ACCENTS[((rank % 3) + 3) % 3];

const CAMPAIGN_COLORS: ColorName[] = ["red", "haddock", "rackham", "tintin", "alcazar", "roberto"];
/** Kampanjens färg från dess plats i skapandeordningen. Samma färg på blocket i årsplanen och bakom kortet. */
export const campaignColor = (rank: number): ColorName => CAMPAIGN_COLORS[((rank % CAMPAIGN_COLORS.length) + CAMPAIGN_COLORS.length) % CAMPAIGN_COLORS.length];

/** Mörk botten kräver vit text. */
export const isDarkColor = (c: ColorName) => c === "red" || c === "haddock" || c === "roberto";

/** Första bokstaven i de två första orden, annars de två första tecknen. */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : name.trim().slice(0, 2)).toUpperCase();
}
