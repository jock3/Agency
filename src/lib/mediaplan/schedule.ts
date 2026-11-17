/**
 * Kampanjernas tidsberäkningar för steg 3: läge (pågår, kommande, avslutad),
 * dagar kvar, progress, ordning, filter och textplacering i årsplanen.
 * Alla datum är ISO-datum (ÅÅÅÅ-MM-DD) och dagens datum räknas i svensk tid.
 */
import { dayNumber } from "./hierarchy";

export type CampaignState = "running" | "upcoming" | "ended";
export type CampaignFilter = "alla" | "pagar" | "avslutade" | "utkast" | "godkanda";

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** Dagens datum i Europe/Stockholm, så att det inte hoppar en dag runt midnatt. */
export function todayIso(now: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "1 jan" eller "1 jan 2026". */
export function dayLabel(iso: string, withYear = false): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export interface CampaignLike {
  period_start: string;
  period_end: string;
  status?: string | null;
}

export const isApproved = (c: Pick<CampaignLike, "status">) => c.status === "approved";

export interface CampaignInfo {
  /** Antal dagar, start- och slutdagen räknade. */
  days: number;
  state: CampaignState;
  approved: boolean;
  dates: string;
  /** Dagar kvar (slutdag − idag). Bara meningsfullt när kampanjen pågår. */
  left: number;
  /** Dag X av N. */
  dayNo: number;
  /** 0–100. */
  progress: number;
  /** Dagar till start. */
  startsIn: number;
  endLabel: string;
  startLabel: string;
}

function stateOf(c: CampaignLike, today: string): CampaignState {
  const t = dayNumber(today);
  return t < dayNumber(c.period_start) ? "upcoming" : t > dayNumber(c.period_end) ? "ended" : "running";
}

export function campaignInfo(c: CampaignLike, today: string): CampaignInfo {
  const a = dayNumber(c.period_start);
  const b = dayNumber(c.period_end);
  const t = dayNumber(today);
  const days = b - a + 1;
  const dayNo = t - a + 1;
  return {
    days,
    state: stateOf(c, today),
    approved: isApproved(c),
    dates: `${dayLabel(c.period_start)} – ${dayLabel(c.period_end)}`,
    left: b - t,
    dayNo,
    progress: Math.min(100, Math.max(0, (dayNo / days) * 100)),
    startsIn: a - t,
    endLabel: dayLabel(c.period_end),
    startLabel: dayLabel(c.period_start),
  };
}

/** Pågående först (slutar tidigast överst), sedan kommande (närmast start först), sist avslutade (senast slut först). */
export function sortCampaigns<T extends CampaignLike>(list: readonly T[], today: string): T[] {
  const rank = (s: CampaignState) => (s === "running" ? 0 : s === "upcoming" ? 1 : 2);
  return [...list].sort((x, y) => {
    const sx = stateOf(x, today), sy = stateOf(y, today);
    if (sx !== sy) return rank(sx) - rank(sy);
    if (sx === "running") return dayNumber(x.period_end) - dayNumber(y.period_end);
    if (sx === "upcoming") return dayNumber(x.period_start) - dayNumber(y.period_start);
    return dayNumber(y.period_end) - dayNumber(x.period_end);
  });
}

export function matchesFilter(c: CampaignLike, filter: CampaignFilter, today: string): boolean {
  switch (filter) {
    case "pagar": return stateOf(c, today) === "running";
    case "avslutade": return stateOf(c, today) === "ended";
    case "utkast": return !isApproved(c);
    case "godkanda": return isApproved(c);
    default: return true;
  }
}

export const FILTERS: { id: CampaignFilter; label: string }[] = [
  { id: "alla", label: "Alla" },
  { id: "pagar", label: "Pågår nu" },
  { id: "avslutade", label: "Avslutade" },
  { id: "utkast", label: "Utkast" },
  { id: "godkanda", label: "Godkända" },
];

export const countFilters = (list: readonly CampaignLike[], today: string) =>
  FILTERS.map((f) => ({ ...f, n: list.filter((c) => matchesFilter(c, f.id, today)).length }));

/**
 * Var namn och datum står i ett block i årsplanen. Ryms inte namnet står det
 * utanför blocket: till vänster om blocket i årets högra hälft, annars till höger.
 */
export function barText(widthPx: number, name: string, dates: string, approved: boolean, center: number) {
  const needName = name.length * 7.6 + 34 + (approved ? 22 : 0);
  const needDates = needName + dates.length * 6.4 + 10;
  return {
    nameInside: widthPx >= needName,
    datesInside: widthPx >= needDates,
    outside: widthPx < needName,
    outsideSide: (center >= 0.5 ? "left" : "right") as "left" | "right",
  };
}

/** Taggar som inte är kundens eller projektets namn, eftersom de redan syns på sidan. */
export function visibleTags(tags: readonly string[] | null | undefined, ...names: string[]): string[] {
  const skip = new Set(names.map((n) => n.trim().toLowerCase()));
  return (tags ?? []).filter((t) => !skip.has(t.trim().toLowerCase()));
}
