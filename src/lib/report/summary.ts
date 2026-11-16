import { effRaw, fmt, isNum, kpiValue, type KpiKey, type PlatformRow, type Values } from "./kpis";

/** En statistiksida sett från sammanfattningen. */
export interface StatsLike {
  title: string;
  platforms: PlatformRow[];
}

/** Alla plattformsrader i alla kampanjer, med plattformens effektiva värden. */
export const allRows = (stats: readonly StatsLike[]): Values[] => stats.flatMap((s) => s.platforms.map(effRaw));

const TILE_ORDER: KpiKey[] = ["spend", "impressions", "clicks", "conversions", "reach", "ctr", "cpc", "cpa"];

/** De fyra första nyckeltalen i ordningen ovan som har data. */
export function summaryTiles(stats: readonly StatsLike[]): { key: KpiKey; value: number }[] {
  const all = allRows(stats);
  return TILE_ORDER.map((key) => ({ key, value: kpiValue(key, all) }))
    .filter((t): t is { key: KpiKey; value: number } => isNum(t.value))
    .slice(0, 4);
}

export interface BudgetEntry {
  name: string;
  value: number;
  /** Andel av total kostnad, 0–1. */
  pct: number;
  /** Andelen i hela procent, avrundad så att alla plattformar tillsammans blir exakt 100. */
  share: number;
  /** Stapelbredd relativt största posten, 0–1. */
  w: number;
}

/** Kostnad per plattformsnamn (versaler spelar ingen roll), största först, högst sex. */
export function budgetByPlatform(stats: readonly StatsLike[]): BudgetEntry[] {
  const map = new Map<string, { name: string; value: number }>();
  for (const s of stats) {
    for (const p of s.platforms) {
      const v = effRaw(p).spend;
      if (!isNum(v)) continue;
      const name = (p.name || "").trim() || "Okänd";
      const key = name.toLowerCase();
      const e = map.get(key) ?? { name, value: 0 };
      e.value += v;
      map.set(key, e);
    }
  }
  const arr = [...map.values()].sort((a, b) => b.value - a.value);
  const total = arr.reduce((a, b) => a + b.value, 0);
  if (total <= 0) return [];
  const shares = largestRemainder(arr.map((e) => (e.value / total) * 100));
  return arr.slice(0, 6).map((e, i) => ({ ...e, pct: e.value / total, share: shares[i], w: e.value / arr[0].value }));
}

/**
 * Avrundning efter största rest: alla avrundas nedåt och de som tappade mest
 * får en procentenhet tillbaka, tills summan är 100. Vanlig avrundning kan ge 101.
 */
export function largestRemainder(percents: number[]): number[] {
  const floors = percents.map(Math.floor);
  let left = Math.round(percents.reduce((a, b) => a + b, 0)) - floors.reduce((a, b) => a + b, 0);
  const order = percents.map((p, i) => ({ i, rest: p - floors[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

export interface Insight {
  /** Plattformen punkten handlar om (fetstil i texten). */
  name: string;
  /** Resten av meningen, efter plattformsnamnet. */
  text: string;
}

/**
 * Sökannonser (Google Ads, Microsoft Ads ...) visas för den som redan letar och
 * får därför mycket högre klickfrekvens än sociala kanaler. De jämförs bara med
 * varandra på CPM, CTR och CPC, aldrig med sociala kanaler.
 */
const SEARCH = /\b(google( ads| search| sök)?|adwords|bing|microsoft ads|sökannons(er)?|sök)\b/i;
export const isSearchChannel = (name: string) => SEARCH.test(name.trim());

/**
 * Upp till fyra höjdpunkter, i ordningen: lägst CPM, högst CTR, lägst CPA,
 * störst budgetandel, lägst CPC. Varje jämförelse kräver minst två rader.
 * CPM, CTR och CPC jämförs bara mellan kanaler av samma typ (sociala med
 * sociala, sök med sök). Kostnad per konvertering jämförs över alla kanaler,
 * eftersom den mäter samma sak oavsett var annonsen visades.
 */
export function insights(stats: readonly StatsLike[]): Insight[] {
  const rows = stats.flatMap((s) =>
    s.platforms.map((p) => {
      const name = (p.name || "").trim() || "Okänd";
      return { name, camp: s.title || "kampanjen", raw: effRaw(p), search: isSearchChannel(name) };
    }),
  );
  const multi = stats.length > 1;
  const mixed = rows.some((r) => r.search) && rows.some((r) => !r.search);
  const out: Insight[] = [];
  const best = (key: KpiKey, dir: "min" | "max", phrase: string, group: "social" | "search" | "all") => {
    const c = rows
      .filter((r) => group === "all" || r.search === (group === "search"))
      .map((r) => ({ ...r, v: kpiValue(key, [r.raw]) }))
      .filter((r): r is typeof r & { v: number } => isNum(r.v));
    if (c.length < 2) return;
    c.sort((a, b) => (dir === "min" ? a.v - b.v : b.v - a.v));
    const r = c[0];
    const among = mixed && group !== "all" ? (group === "search" ? " bland sökkanaler" : " bland sociala kanaler") : "";
    out.push({ name: r.name, text: `${phrase}${among}${multi ? ` i ${r.camp}` : ""}: ${fmt(key, r.v)}` });
  };
  best("cpm", "min", "hade lägst CPM", "social");
  best("ctr", "max", "hade högst CTR", "social");
  best("cpa", "min", "hade lägst kostnad per konvertering", "all");
  const b = budgetByPlatform(stats);
  if (b.length > 1) out.push({ name: b[0].name, text: `stod för störst del av budgeten: ${b[0].share}\u00a0%` });
  best("cpc", "min", "hade lägst CPC", "social");
  best("ctr", "max", "hade högst CTR", "search");
  best("cpc", "min", "hade lägst CPC", "search");
  return out.slice(0, 4);
}
