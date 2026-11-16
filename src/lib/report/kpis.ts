/**
 * SoMe-rapportbyggaren: KPI-bibliotek och beräkningsregler. Porterat från
 * prototypen (some-rapport-prototyp.html). Ren fil utan server- eller
 * webbläsarkod, så att editorn, förhandsvisningen och PDF-sidan räknar likadant.
 *
 * Bara rådata sparas. Kvoter (CTR, CPA ...) räknas alltid ut och sparas aldrig.
 */

export type RawKey = "spend" | "impressions" | "reach" | "clicks" | "conversions" | "videoViews" | "engagement";
export type KpiKey = RawKey | "frequency" | "ctr" | "cpc" | "cpm" | "cpa" | "er";
export type Values = Partial<Record<RawKey, number | null>>;
type Format = "kr0" | "kr2" | "pct" | "dec2" | "int";

interface KpiDef {
  name: string;
  /** Förkortning, om måttet har en etablerad. */
  abbr?: string;
  /** Kolumnrubrik i tabeller. */
  col: string;
  fmt: Format;
  /** Rådata som måttet räknas ur. Saknas för rena rådatamått. */
  deps?: RawKey[];
  calc?: (v: Record<string, number>) => number;
  formula?: string;
  desc: string;
}

export const KPIS: Record<KpiKey, KpiDef> = {
  spend: { name: "Kostnad", col: "Kostnad", fmt: "kr0", desc: "Hur mycket av annonsbudgeten som har använts under perioden." },
  impressions: { name: "Visningar", col: "Visningar", fmt: "int", desc: "Antal gånger annonserna har visats. Samma person kan se en annons flera gånger." },
  reach: { name: "Räckvidd", col: "Räckvidd", fmt: "int", desc: "Antal unika personer som har sett annonserna minst en gång." },
  frequency: { name: "Frekvens", col: "Frekvens", fmt: "dec2", deps: ["impressions", "reach"], calc: (v) => v.impressions / v.reach, formula: "Visningar ÷ räckvidd", desc: "Hur många gånger varje person i snitt har sett annonserna." },
  clicks: { name: "Klick", col: "Klick", fmt: "int", desc: "Antal klick på annonsens länk vidare till webbplatsen." },
  ctr: { name: "Klickfrekvens", abbr: "CTR", col: "CTR", fmt: "pct", deps: ["clicks", "impressions"], calc: (v) => v.clicks / v.impressions, formula: "Klick ÷ visningar", desc: "Andelen visningar som ledde till ett klick. Visar hur relevant annonsen upplevs." },
  cpc: { name: "Kostnad per klick", abbr: "CPC", col: "CPC", fmt: "kr2", deps: ["spend", "clicks"], calc: (v) => v.spend / v.clicks, formula: "Kostnad ÷ klick", desc: "Vad varje klick har kostat i snitt." },
  cpm: { name: "Kostnad per tusen visningar", abbr: "CPM", col: "CPM", fmt: "kr2", deps: ["spend", "impressions"], calc: (v) => (v.spend / v.impressions) * 1000, formula: "Kostnad ÷ visningar × 1 000", desc: "Vad det kostar att visa annonserna tusen gånger. Ett mått på hur dyrt det är att nå ut." },
  conversions: { name: "Konverteringar", col: "Konverteringar", fmt: "int", desc: "Antal önskade handlingar efter annonsen, till exempel köp, bokningar eller anmälningar." },
  cpa: { name: "Kostnad per konvertering", abbr: "CPA", col: "CPA", fmt: "kr2", deps: ["spend", "conversions"], calc: (v) => v.spend / v.conversions, formula: "Kostnad ÷ konverteringar", desc: "Vad varje konvertering har kostat i snitt." },
  videoViews: { name: "Videovisningar", col: "Videovisningar", fmt: "int", desc: "Antal gånger videon har spelats i minst tre sekunder." },
  engagement: { name: "Engagemang", col: "Engagemang", fmt: "int", desc: "Reaktioner, kommentarer, delningar och sparningar." },
  er: { name: "Engagemangsgrad", abbr: "ER", col: "ER", fmt: "pct", deps: ["engagement", "impressions"], calc: (v) => v.engagement / v.impressions, formula: "Engagemang ÷ visningar", desc: "Andelen visningar som ledde till en interaktion med annonsen." },
};

/** Visningsordning. Kolumner visas alltid i den här ordningen, oavsett hur de valdes. */
export const KPI_ORDER: KpiKey[] = ["spend", "impressions", "reach", "frequency", "clicks", "ctr", "cpc", "cpm", "conversions", "cpa", "videoViews", "engagement", "er"];
export const RAW_KEYS: RawKey[] = ["spend", "impressions", "reach", "clicks", "conversions", "videoViews", "engagement"];

export const isKpiKey = (v: unknown): v is KpiKey => typeof v === "string" && v in KPIS;
export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** KPI:erna i bibliotekets ordning, utan okända och dubbletter. */
export const sortKpis = (keys: readonly string[] | undefined): KpiKey[] => KPI_ORDER.filter((k) => (keys ?? []).includes(k));

/** Rådata som krävs för att visa de valda KPI:erna. Väljer man bara CTR behövs bara klick och visningar. */
export const neededRaw = (keys: readonly KpiKey[]): RawKey[] =>
  RAW_KEYS.filter((r) => keys.some((k) => k === r || (KPIS[k].deps ?? []).includes(r)));

/**
 * KPI-värde för en eller flera rader. Summor tar med alla rader som har data.
 * Kvoter räknas bara på rader där all underliggande data finns (matchad täckning),
 * så att en kampanj utan konverteringar inte späder ut CPA. Null när data saknas
 * eller vid division med noll.
 */
export function kpiValue(key: KpiKey, rows: readonly (Values | null | undefined)[]): number | null {
  const def = KPIS[key];
  if (!def.deps || !def.calc) {
    let sum: number | null = null;
    for (const r of rows) {
      const v = r?.[key as RawKey];
      if (isNum(v)) sum = (sum ?? 0) + v;
    }
    return sum;
  }
  const deps = def.deps;
  const ok = rows.filter((r): r is Values => !!r && deps.every((d) => isNum(r[d])));
  if (!ok.length) return null;
  const agg: Record<string, number> = {};
  for (const d of deps) agg[d] = ok.reduce((a, r) => a + (r[d] as number), 0);
  const v = def.calc(agg);
  return Number.isFinite(v) ? v : null;
}

export interface Ad {
  id: string;
  name: string;
  values: Values;
}
export interface PlatformRow {
  id: string;
  name: string;
  values: Values;
  ads: Ad[];
}

/**
 * Plattformens värden: eget värde om det är ifyllt, annars summan av annonserna.
 * Gäller varje mått för sig. Räckvidd går inte att summera mellan annonser, så
 * den fylls i på plattformen.
 */
export function effRaw(p: Pick<PlatformRow, "values" | "ads">): Values {
  const out: Values = {};
  for (const m of RAW_KEYS) {
    const own = p.values?.[m];
    if (isNum(own)) out[m] = own;
    else if (p.ads?.length) out[m] = kpiValue(m, p.ads.map((a) => a.values));
    else out[m] = null;
  }
  return out;
}

/* ---------- Formatering och inläsning (sv-SE) ---------- */

const nf0 = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Hårt mellanslag som tusentalsavgränsare och vanligt minustecken. */
const fixSpace = (s: string) => s.replace(/[  \s]/g, " ").replace(/−/g, "-");

export const fmtPlain = (v: number) => fixSpace(nf0.format(v));

export function fmt(key: KpiKey, v: number | null | undefined): string {
  if (!isNum(v)) return "–";
  switch (KPIS[key].fmt) {
    case "kr0": return `${fixSpace(nf0.format(v))} kr`;
    case "kr2": return `${fixSpace(nf2.format(v))} kr`;
    case "pct": return `${fixSpace(nf2.format(v * 100))} %`;
    case "dec2": return fixSpace(nf2.format(v));
    default: return fixSpace(nf0.format(v));
  }
}

/** Tal som visas i ett inmatningsfält: decimalkomma. */
export const toInput = (v: number) => String(v).replace(".", ",");

/**
 * Läser svenska skrivsätt: "412 000", "2,5", "8 200 kr", "0,5 %".
 * Tom text ger null (tomt fält), ogiltig text ger NaN (röd ram, räknas som tomt).
 */
export function parseNum(s: string): number | null {
  const t = String(s).replace(/[\s  ]/g, "").replace(/kr|%/gi, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}
