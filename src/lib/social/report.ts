/**
 * Rapportverktyget: manuellt inmatade siffror per plattform. Ren fil (ingen
 * serverkod) så att klient, server och senare PDF/kundlänk räknar likadant.
 * CTR, CPC och CPM sparas aldrig, de räknas ut här.
 */

export interface ReportRow {
  platform: string;
  reach: number;
  impressions: number;
  clicks: number;
  /** Kostnad i kronor. */
  spend: number;
}

export interface Totals {
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
}

export interface Kpis extends Totals {
  /** Klick / exponeringar, i procent. Null när exponeringar saknas. */
  ctr: number | null;
  /** Kostnad per klick, kr. Null när klick saknas. */
  cpc: number | null;
  /** Kostnad per tusen exponeringar, kr. Null när exponeringar saknas. */
  cpm: number | null;
}

export const MAX_ROWS = 20;
const MAX_VALUE = 1e12;

export function kpis(t: Totals): Kpis {
  return {
    ...t,
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : null,
    cpc: t.clicks > 0 ? t.spend / t.clicks : null,
    cpm: t.impressions > 0 ? (t.spend / t.impressions) * 1000 : null,
  };
}

/**
 * Summan över raderna. Räckvidd är inte additiv mellan plattformar (samma
 * person kan nås på flera), så totalen är en övre gräns och märks så i vyn.
 */
export function totalsOf(rows: ReportRow[]): Totals {
  return rows.reduce<Totals>(
    (s, r) => ({ reach: s.reach + r.reach, impressions: s.impressions + r.impressions, clicks: s.clicks + r.clicks, spend: s.spend + r.spend }),
    { reach: 0, impressions: 0, clicks: 0, spend: 0 },
  );
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/\s/g, "").replace(",", ".")) : 0;
  return Number.isFinite(n) && n >= 0 && n <= MAX_VALUE ? n : null;
};

/** Gör om okänd indata till rader, eller null om något är ogiltigt. */
export function parseRows(input: unknown): ReportRow[] | null {
  if (!Array.isArray(input) || input.length > MAX_ROWS) return null;
  const rows: ReportRow[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const platform = typeof r.platform === "string" ? r.platform.trim() : "";
    const reach = num(r.reach);
    const impressions = num(r.impressions);
    const clicks = num(r.clicks);
    const spend = num(r.spend);
    if (!platform || platform.length > 40 || reach === null || impressions === null || clicks === null || spend === null) return null;
    // Klick över exponeringar är nästan alltid ett inmatningsfel.
    if (impressions > 0 && clicks > impressions) return null;
    rows.push({ platform, reach: Math.round(reach), impressions: Math.round(impressions), clicks: Math.round(clicks), spend });
  }
  return rows;
}

const sv = (digits: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const fmtInt = (n: number) => sv(0).format(n);
export const fmtKr = (n: number | null) => (n === null ? "–" : `${sv(2).format(n)} kr`);
export const fmtPct = (n: number | null) => (n === null ? "–" : `${sv(2).format(n)} %`);
export const fmtNum = (n: number | null) => (n === null ? "–" : fmtInt(n));
