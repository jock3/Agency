/**
 * Mediaplanens nivåer: kund → projekt → plan (årsplan eller kampanj) → rapport.
 * Rena funktioner för taggar och summeringar, så att samma regler gäller i
 * serverfunktionerna, i gränssnittet och i testerna.
 */

export interface PlanLike {
  kind?: "year" | "campaign" | null;
  plan_year?: number | null;
  period_start: string;
  period_end: string;
  planned_budget: number | null;
  archived: boolean;
}

/** Taggar som sätts automatiskt: kund, projekt och (för kampanjer) kampanjens namn. */
export function hierarchyTags(client: string, project: string, campaign?: string): string[] {
  const out: string[] = [];
  for (const t of [client, project, campaign]) {
    const s = (t ?? "").trim().slice(0, 40);
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out;
}

/** Lägger till taggar utan dubbletter (skiftlägesokänsligt), befintliga först. */
export function mergeTags(existing: readonly string[] | null | undefined, add: readonly string[]): string[] {
  const out = [...(existing ?? [])];
  for (const t of add) if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  return out;
}

/** Byter en tagg mot en ny vid namnbyte. Finns den nya redan tas den gamla bara bort. */
export function renameTag(tags: readonly string[] | null | undefined, from: string, to: string): string[] {
  const f = from.trim().toLowerCase();
  const t = to.trim().slice(0, 40);
  if (!f || !t) return [...(tags ?? [])];
  const out: string[] = [];
  for (const tag of tags ?? []) {
    const next = tag.toLowerCase() === f ? t : tag;
    if (!out.some((o) => o.toLowerCase() === next.toLowerCase())) out.push(next);
  }
  return out;
}

/** Vilket år en plan räknas till: årsplanens år, annars året den startar. */
export function planYear(p: Pick<PlanLike, "kind" | "plan_year" | "period_start">): number | null {
  if (p.kind === "year" && p.plan_year) return p.plan_year;
  const y = Number(p.period_start?.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

/** Om en plan pågår någon gång under ett år. */
export function overlapsYear(p: Pick<PlanLike, "period_start" | "period_end">, year: number): boolean {
  return p.period_start <= `${year}-12-31` && p.period_end >= `${year}-01-01`;
}

/**
 * Summering för en nivå (kund, projekt eller år). I dag planerad budget och
 * antal; fältet är tänkt att få utfall från rapporterna (kostnad, räckvidd,
 * konverteringar) när statistiken byggs.
 */
export interface Rollup {
  plans: number;
  yearPlans: number;
  campaigns: number;
  plannedBudget: number;
  /** Planer utan budget räknas inte in i plannedBudget. */
  missingBudget: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export function rollup(plans: readonly PlanLike[], opts: { includeArchived?: boolean } = {}): Rollup {
  const list = opts.includeArchived ? plans : plans.filter((p) => !p.archived);
  const r: Rollup = { plans: list.length, yearPlans: 0, campaigns: 0, plannedBudget: 0, missingBudget: 0, periodStart: null, periodEnd: null };
  for (const p of list) {
    if (p.kind === "year") r.yearPlans++;
    else r.campaigns++;
    if (typeof p.planned_budget === "number" && Number.isFinite(p.planned_budget)) r.plannedBudget += p.planned_budget;
    else r.missingBudget++;
    if (!r.periodStart || p.period_start < r.periodStart) r.periodStart = p.period_start;
    if (!r.periodEnd || p.period_end > r.periodEnd) r.periodEnd = p.period_end;
  }
  return r;
}

export const formatKr = (v: number) => `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(v).replace(/[  ]/g, " ")} kr`;

// ---- Årskalender ----

export interface YearBlock<T> {
  item: T;
  /** Andel av året (0–1) där blocket börjar och slutar. */
  start: number;
  end: number;
  /** Rad i kalendern; överlappande kampanjer hamnar på olika rader. */
  lane: number;
  /** Kampanjen börjar före eller slutar efter året. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};
export const daysInYear = (year: number) => dayNumber(`${year + 1}-01-01`) - dayNumber(`${year}-01-01`);

/** Månadernas gränser som andel av året, för rubrikrad och stödlinjer. */
export function monthEdges(year: number): number[] {
  const first = dayNumber(`${year}-01-01`);
  const total = daysInYear(year);
  return Array.from({ length: 13 }, (_, m) => (dayNumber(`${m === 12 ? year + 1 : year}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`) - first) / total);
}

/** Dagens plats i året (0–1), eller null om dagen inte ligger i året. */
export function todayFraction(year: number, today: string): number | null {
  const d = dayNumber(today) - dayNumber(`${year}-01-01`);
  return d >= 0 && d < daysInYear(year) ? (d + 0.5) / daysInYear(year) : null;
}

/**
 * Lägger kampanjerna som block över ett år. Slutdagen räknas med, så en
 * kampanj som slutar 31/12 fyller året ut. Block som överlappar i tid hamnar
 * på olika rader; ingen kampanj utanför året tas med.
 */
export function layoutYear<T extends { period_start: string; period_end: string }>(items: readonly T[], year: number): YearBlock<T>[] {
  const first = dayNumber(`${year}-01-01`);
  const total = daysInYear(year);
  const blocks = items
    .filter((p) => overlapsYear(p, year))
    .map((item) => {
      const s = dayNumber(item.period_start) - first;
      const e = dayNumber(item.period_end) - first + 1;
      return {
        item,
        start: Math.max(0, s) / total,
        end: Math.min(total, Math.max(e, s + 1)) / total,
        lane: 0,
        clippedStart: s < 0,
        clippedEnd: e > total,
      };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  for (const b of blocks) {
    let lane = laneEnds.findIndex((end) => end <= b.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = b.end;
    b.lane = lane;
  }
  return blocks;
}
