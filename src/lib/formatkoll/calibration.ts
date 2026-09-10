import { PLACEMENTS, type Placement, type SafeZone } from "./placements";

/**
 * Kalibreringsläge (HANDOFF §10). Skyddszonerna i PLACEMENTS är hämtade ur
 * plattformarnas publicerade specar, inte uppmätta på en riktig telefon. Det här
 * är verktyget som gör om dem till uppmätta.
 *
 * Arbetsgången: lägg en skärmdump av ett riktigt inlägg över ramen, ställ in
 * opacitet och passning tills skärmdumpens videoyta täcker ramen, och dra sedan
 * zonsiffrorna tills de ligger på plattformens knappar. Siffrorna sparas i
 * localStorage så arbetet överlever en omladdning, och kopieras till sist in i
 * placements.ts.
 *
 * Ingenting här påverkar den vanliga vyn. Utan ?kalibrera=1 läses filen aldrig.
 */

export const CALIBRATION_PARAM = "kalibrera";
const STORAGE_KEY = "formatkoll:kalibrering";

export interface ZoneOverride extends SafeZone {
  clip: number | null;
}

/** Skärmdumpens läge över ramen. En iPhone är ~9:19,5 och assetet 9:16, så
 *  skärmdumpen måste kunna skalas och flyttas för att videoytan ska matcha. */
export interface RefTransform {
  opacity: number;
  scale: number;
  x: number;
  y: number;
}

export type Calibration = Record<string, ZoneOverride>;

export const DEFAULT_TRANSFORM: RefTransform = { opacity: 50, scale: 100, x: 0, y: 0 };

export function loadCalibration(): Calibration {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Calibration) : {};
  } catch {
    return {};
  }
}

export function saveCalibration(cal: Calibration) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cal));
  } catch {
    // Full eller avstängd localStorage ska inte stoppa kalibreringen —
    // siffrorna lever kvar i minnet så länge fliken är öppen.
  }
}

export const overrideFor = (placement: Placement, cal: Calibration): ZoneOverride =>
  cal[placement.id] ?? { ...placement.safe, clip: placement.clip };

/** Placeringen som den ska ritas just nu: kalibrerade siffror om de finns. */
export function withCalibration(placement: Placement, cal: Calibration): Placement {
  const o = cal[placement.id];
  if (!o) return placement;
  return {
    ...placement,
    safe: { top: o.top, right: o.right, bottom: o.bottom, left: o.left },
    clip: o.clip,
  };
}

const same = (a: ZoneOverride, p: Placement) =>
  a.top === p.safe.top &&
  a.right === p.safe.right &&
  a.bottom === p.safe.bottom &&
  a.left === p.safe.left &&
  a.clip === p.clip;

/** Text att klistra in i placements.ts. Bara placeringar som faktiskt ändrats
 *  kommer med — resten ska inte röras av en kalibrering de inte ingick i. */
export function toSource(cal: Calibration): string {
  const changed = PLACEMENTS.filter((p) => cal[p.id] && !same(cal[p.id], p));
  if (changed.length === 0) return "// Inget ändrat än.";
  return changed
    .map((p) => {
      const o = cal[p.id];
      return [
        `// ${p.channel} · ${p.name} — uppmätt ${new Date().toISOString().slice(0, 10)}`,
        `id: "${p.id}"`,
        `clip: ${o.clip === null ? "null" : o.clip},`,
        `safe: { top: ${o.top}, right: ${o.right}, bottom: ${o.bottom}, left: ${o.left} },`,
      ].join("\n");
    })
    .join("\n\n");
}

export function isCalibrating(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(CALIBRATION_PARAM) === "1";
}
