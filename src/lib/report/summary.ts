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
  return total > 0 ? arr.slice(0, 6).map((e) => ({ ...e, pct: e.value / total, w: e.value / arr[0].value })) : [];
}

export interface Insight {
  /** Plattformen punkten handlar om (fetstil i texten). */
  name: string;
  /** Resten av meningen, efter plattformsnamnet. */
  text: string;
}

/**
 * Upp till fyra höjdpunkter, i ordningen: lägst CPM, högst CTR, lägst CPA,
 * störst budgetandel, lägst CPC. Varje jämförelse kräver minst två rader.
 */
export function insights(stats: readonly StatsLike[]): Insight[] {
  const rows = stats.flatMap((s) => s.platforms.map((p) => ({ name: (p.name || "").trim() || "Okänd", camp: s.title || "kampanjen", raw: effRaw(p) })));
  const multi = stats.length > 1;
  const out: Insight[] = [];
  const best = (key: KpiKey, dir: "min" | "max", phrase: string) => {
    const c = rows.map((r) => ({ ...r, v: kpiValue(key, [r.raw]) })).filter((r): r is typeof r & { v: number } => isNum(r.v));
    if (c.length < 2) return;
    c.sort((a, b) => (dir === "min" ? a.v - b.v : b.v - a.v));
    const r = c[0];
    out.push({ name: r.name, text: `${phrase}${multi ? ` i ${r.camp}` : ""}: ${fmt(key, r.v)}` });
  };
  best("cpm", "min", "hade lägst CPM");
  best("ctr", "max", "hade högst CTR");
  best("cpa", "min", "hade lägst kostnad per konvertering");
  const b = budgetByPlatform(stats);
  if (b.length > 1) out.push({ name: b[0].name, text: `stod för störst del av budgeten: ${Math.round(b[0].pct * 100)} %` });
  best("cpc", "min", "hade lägst CPC");
  return out.slice(0, 4);
}
