import { isKpiKey, isNum, RAW_KEYS, type Ad, type KpiKey, type PlatformRow, type RawKey, type Values } from "./kpis";

/**
 * Rapportdokumentet som sparas i report_docs.doc. All indata från webbläsaren
 * passerar normalizeDoc, som kastar bort det som inte hör hemma i formen och
 * fyller i det som saknas, så att gamla och handgjorda filer går att öppna.
 */

export type SectionType = "cover" | "kpi" | "stats" | "comment" | "summary";
export const SECTION_TYPES: Record<SectionType, { name: string; desc: string }> = {
  cover: { name: "Startsida", desc: "Kundnamn, kampanj och period" },
  kpi: { name: "KPI:er", desc: "Valda mått och vad de betyder" },
  stats: { name: "Statistik", desc: "Plattformar och annonser mot KPI:er" },
  comment: { name: "Kommentar", desc: "Rubrik och fritext" },
  summary: { name: "Sammanfattning", desc: "Summerar alla statistiksidor automatiskt" },
};

export interface Meta {
  client: string;
  campaign: string;
  period: string;
  date: string;
  agency: string;
}

export type Section =
  | { id: string; type: "cover"; subtitle: string }
  | { id: string; type: "kpi"; heading: string; intro: string; kpis: KpiKey[]; descs: Partial<Record<KpiKey, string>> }
  | { id: string; type: "stats"; title: string; subtitle: string; kpis: KpiKey[]; showAds: boolean; platforms: PlatformRow[] }
  | { id: string; type: "comment"; label: string; heading: string; body: string }
  | { id: string; type: "summary"; heading: string; kpis: KpiKey[]; showTiles: boolean; showBudget: boolean; showInsights: boolean; conclusion: string };

export interface ReportDoc {
  version: 1;
  meta: Meta;
  /** Logotyper per plattformsnamn (gemener), som data-URL till en PNG. */
  logos: Record<string, string>;
  sections: Section[];
}

export const MAX_SECTIONS = 40;
export const MAX_PLATFORMS = 20;
export const MAX_ADS = 40;
const MAX_LOGO_CHARS = 120_000;
const LOGO_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const id = (v: unknown, fallback: string) => (typeof v === "string" && ID.test(v) ? v : fallback);
const kpiList = (v: unknown): KpiKey[] => (Array.isArray(v) ? [...new Set(v.filter(isKpiKey))] : []);

function values(v: unknown): Values {
  const out: Values = {};
  if (!v || typeof v !== "object") return out;
  for (const k of RAW_KEYS) {
    const n = (v as Record<string, unknown>)[k];
    if (isNum(n) && n >= 0 && n <= 1e12) out[k as RawKey] = n;
  }
  return out;
}

export const newId = () => Math.random().toString(36).slice(2, 10);

export const logoKey = (name: string) => String(name ?? "").trim().toLowerCase();

export function normalizeDoc(input: unknown): ReportDoc | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (!Array.isArray(o.sections) || o.sections.length > MAX_SECTIONS) return null;
  const m = (o.meta && typeof o.meta === "object" ? o.meta : {}) as Record<string, unknown>;
  const meta: Meta = { client: str(m.client, 160), campaign: str(m.campaign, 160), period: str(m.period, 80), date: str(m.date, 60), agency: str(m.agency, 80) };

  const logos: Record<string, string> = {};
  if (o.logos && typeof o.logos === "object") {
    for (const [k, v] of Object.entries(o.logos as Record<string, unknown>)) {
      if (typeof v === "string" && v.length <= MAX_LOGO_CHARS && LOGO_URL.test(v) && k.length <= 60) logos[k.trim().toLowerCase()] = v;
    }
  }

  const sections: Section[] = [];
  for (const raw of o.sections) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const sid = id(s.id, newId());
    switch (s.type) {
      case "cover":
        sections.push({ id: sid, type: "cover", subtitle: str(s.subtitle, 160) });
        break;
      case "kpi": {
        const descs: Partial<Record<KpiKey, string>> = {};
        if (s.descs && typeof s.descs === "object") for (const [k, v] of Object.entries(s.descs)) if (isKpiKey(k) && typeof v === "string") descs[k] = v.slice(0, 400);
        sections.push({ id: sid, type: "kpi", heading: str(s.heading, 160), intro: str(s.intro, 600), kpis: kpiList(s.kpis), descs });
        break;
      }
      case "stats": {
        if (!Array.isArray(s.platforms) || s.platforms.length > MAX_PLATFORMS) return null;
        const platforms: PlatformRow[] = [];
        for (const rp of s.platforms) {
          if (!rp || typeof rp !== "object") continue;
          const p = rp as Record<string, unknown>;
          const rawAds = Array.isArray(p.ads) ? p.ads : [];
          if (rawAds.length > MAX_ADS) return null;
          const ads: Ad[] = rawAds
            .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
            .map((a) => ({ id: id(a.id, newId()), name: str(a.name, 160), values: values(a.values) }));
          platforms.push({ id: id(p.id, newId()), name: str(p.name, 60), values: values(p.values), ads });
        }
        sections.push({ id: sid, type: "stats", title: str(s.title, 160), subtitle: str(s.subtitle, 240), kpis: kpiList(s.kpis), showAds: bool(s.showAds, true), platforms });
        break;
      }
      case "comment":
        sections.push({ id: sid, type: "comment", label: str(s.label, 40), heading: str(s.heading, 160), body: str(s.body, 5000) });
        break;
      case "summary":
        sections.push({ id: sid, type: "summary", heading: str(s.heading, 160), kpis: kpiList(s.kpis), showTiles: bool(s.showTiles, true), showBudget: bool(s.showBudget, true), showInsights: bool(s.showInsights, true), conclusion: str(s.conclusion, 1200) });
        break;
      default:
        break; // okänd sektionstyp: hoppas över
    }
  }
  return { version: 1, meta, logos, sections };
}

const today = () => new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

/** Ny tom rapport: bara en startsida. */
export function blankDoc(client = "", campaign = ""): ReportDoc {
  return {
    version: 1,
    meta: { client: client || "Kundnamn", campaign: campaign || "Kampanjnamn", period: "", date: today(), agency: "Milou Communication" },
    logos: {},
    sections: [{ id: newId(), type: "cover", subtitle: "Utvärdering av annonsering i sociala medier" }],
  };
}
