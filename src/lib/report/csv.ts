import { MAX_ADS } from "./doc";
import { RAW_KEYS, type Ad, type PlatformRow, type RawKey, type Values } from "./kpis";

/**
 * CSV-import från annonsverktygens exporter (Meta, TikTok, LinkedIn, Google Ads,
 * Snapchat). Exporterna skiljer sig åt: avgränsare (komma, semikolon, tabb),
 * teckenkodning (UTF-8 eller UTF-16), rader med rapportnamn och datum före
 * rubrikraden, totalrader, och tal skrivna på svenska eller engelska.
 * Kolumnerna gissas utifrån rubrikerna, och användaren kan alltid rätta gissningen.
 * Ren fil utan webbläsarkod, så att allt går att testa.
 */

/** Text ur filens bytes. UTF-16 (vanligt i LinkedIn och Google Ads) känns igen på sin BOM. */
export function decodeFile(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  const text = new TextDecoder("utf-8").decode(bytes);
  return text.replace(/^﻿/, "");
}

/** Delar en rad i fält. Citattecken skyddar avgränsare och radbrytningar; "" är ett citattecken. */
function splitRecords(text: string, delim: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    out.push(row);
  }
  return out.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ""));
}

/** Avgränsaren som ger flest fält, lika många på de flesta raderna. */
function sniffDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 30).join("\n");
  let best = ",";
  let bestScore = -1;
  for (const d of [",", ";", "\t", "|"]) {
    const rows = splitRecords(sample, d);
    const counts = rows.map((r) => r.length).filter((n) => n > 1);
    if (!counts.length) continue;
    const mode = [...counts].sort((a, b) => counts.filter((x) => x === b).length - counts.filter((x) => x === a).length)[0];
    const score = counts.filter((n) => n === mode).length * mode;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export interface Table {
  delimiter: string;
  headers: string[];
  rows: string[][];
  /** Rader före rubrikraden (rapportnamn, datum), som hoppades över. */
  skippedPreamble: number;
}

const looksNumeric = (s: string) => parseCell(s) !== null;

/**
 * Läser en CSV-text. Rubrikraden är den första raden med lika många fält som
 * huvuddelen av filen och mest text, så att rapportnamn och datum ovanför hoppas över.
 */
export function parseCsv(text: string): Table | null {
  const delimiter = sniffDelimiter(text);
  const records = splitRecords(text, delimiter);
  if (records.length < 2) return null;
  const counts = records.map((r) => r.length);
  const width = [...counts].sort((a, b) => counts.filter((x) => x === b).length - counts.filter((x) => x === a).length)[0];
  if (width < 2) return null;
  const headerAt = records.findIndex((r) => r.length >= width && r.filter((f) => f && !looksNumeric(f)).length >= Math.ceil(width / 2));
  if (headerAt < 0) return null;
  const headers = records[headerAt].map((h, i) => h || `Kolumn ${i + 1}`);
  const rows = records.slice(headerAt + 1).map((r) => headers.map((_, i) => r[i] ?? ""));
  return { delimiter, headers, rows, skippedPreamble: headerAt };
}

/**
 * Ett tal ur en cell, på svenska eller engelska: "412 000", "1,234.56",
 * "1.234,56", "2,5", "8 200 kr", "SEK 1,200", "0.86%". Tomt, "-" och "--" blir null.
 */
export function parseCell(raw: string): number | null {
  let s = String(raw ?? "").trim();
  if (!s || /^[-–—]+$/.test(s)) return null;
  s = s.replace(/[\s  ]/g, "").replace(/(sek|kr|usd|eur|nok|dkk|[$€£%])/gi, "");
  if (!s || !/^-?[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Den som står sist är decimaltecknet.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot >= 0) {
    // "1.234.567" är tusental; "1.234" och "2.5" läses som decimaltal.
    if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Gissa kolumner ---------- */

const norm = (h: string) =>
  h
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-zåäöé0-9]+/g, " ")
    .trim();

/** Kvoter och kostnad per något är aldrig rådata. */
const RATIO = /\b(per|ctr|cpc|cpm|cpa|cpv|rate|frekvens|frequency|andel|procent|percent|average|avg|genomsnitt|snitt)\b|%/i;

/** Rubriker per mått, i prioritetsordning. Jämförs med normaliserad rubrik (gemener, utan parenteser). */
const SYNONYMS: Record<RawKey, string[]> = {
  spend: ["amount spent", "spenderat belopp", "belopp som spenderats", "total spent", "spend", "cost", "kostnad", "kostnader", "spenderat"],
  impressions: ["impressions", "impression", "visningar", "exponeringar", "impr", "visn", "paid impressions", "betalda visningar"],
  reach: ["reach", "räckvidd", "unique reach", "unik räckvidd", "unika användare", "unique users"],
  clicks: ["link clicks", "länkklick", "clicks destination", "klick destination", "clicks", "klick", "swipe ups", "swipe up", "swipes", "swipe uppåt"],
  conversions: ["conversions", "konverteringar", "results", "resultat", "purchases", "köp", "leads"],
  videoViews: ["video views", "videovisningar", "3 second video plays", "videouppspelningar på 3 sekunder", "video plays", "videouppspelningar", "thruplays"],
  engagement: ["post engagement", "inläggsengagemang", "engagements", "engagement", "engagemang", "interactions", "interaktioner"],
};
const NAME_SYNONYMS = ["ad name", "annonsnamn", "creative name", "ad", "annons", "campaign name", "kampanjnamn", "campaign", "kampanj", "ad group", "annonsgrupp", "ad set name", "annonsgruppens namn"];

function pick(headers: string[], synonyms: string[], taken: Set<number>, allowRatio = false): number | null {
  const n = headers.map(norm);
  for (const syn of synonyms) {
    const exact = n.findIndex((h, i) => !taken.has(i) && h === syn && (allowRatio || !RATIO.test(headers[i])));
    if (exact >= 0) return exact;
  }
  for (const syn of synonyms) {
    const part = n.findIndex((h, i) => !taken.has(i) && (h.startsWith(`${syn} `) || h.endsWith(` ${syn}`)) && (allowRatio || !RATIO.test(headers[i])));
    if (part >= 0) return part;
  }
  return null;
}

export interface Mapping {
  /** Kolumnen med annonsens namn. */
  name: number | null;
  metrics: Record<RawKey, number | null>;
}

export function guessMapping(headers: string[]): Mapping {
  const taken = new Set<number>();
  const name = pick(headers, NAME_SYNONYMS, taken, true);
  if (name !== null) taken.add(name);
  const metrics = {} as Record<RawKey, number | null>;
  for (const k of RAW_KEYS) {
    const col = pick(headers, SYNONYMS[k], taken);
    metrics[k] = col;
    if (col !== null) taken.add(col);
  }
  return { name, metrics };
}

/** Plattformen gissad ur filnamnet och rubrikerna. Användaren kan alltid ändra. */
export function guessPlatform(filename: string, headers: string[]): string {
  const f = filename.toLowerCase();
  const h = headers.map(norm).join("|");
  if (/tiktok/.test(f)) return "TikTok";
  if (/linkedin/.test(f)) return "LinkedIn";
  if (/snap/.test(f)) return "Snapchat";
  if (/google|adwords/.test(f)) return "Google Ads";
  if (/meta|facebook|instagram|fb/.test(f)) return "Meta";
  if (/swipe/.test(h)) return "Snapchat";
  if (/amount spent|spenderat belopp|belopp som spenderats|annonsleverans|ad delivery/.test(h)) return "Meta";
  if (/\bimpr\b|\bvisn\b|annonsgrupp|ad group/.test(h)) return "Google Ads";
  if (/clicks destination|\bimpression\b/.test(h)) return "TikTok";
  if (/total spent|creative name/.test(h)) return "LinkedIn";
  return "";
}

/* ---------- Bygga plattformen ---------- */

/** Totalrader och sammanfattningsrader i exporterna. */
const TOTAL = /^(total|totalt|totals|summa|sum|alla|all|results from|resultat från|grand total)\b/i;

export interface ImportResult {
  platform: PlatformRow;
  /** Antal rader som blev annonser. */
  ads: number;
  /** Totalrader och tomma rader som hoppades över. */
  skipped: number;
  /** Annonser som förekom på flera rader (till exempel en rad per dag) och slogs ihop. */
  merged: number;
  /** Räckvidden hämtades från filens totalrad och står på plattformen. */
  reachFromTotal: boolean;
  /** Celler som inte gick att läsa som tal och räknades som tomma. */
  badCells: number;
  /** Annonser utöver taket per plattform, som inte kom med. */
  dropped: number;
}

/**
 * Plattformen med en annons per rad. Rader med samma annonsnamn slås ihop
 * (summan av varje mått). Räckvidd går inte att summera, så sammanslagna
 * annonser får ingen räckvidd. Finns en totalrad med räckvidd används den
 * som plattformens räckvidd, eftersom den är utan överlapp.
 */
export function buildPlatform(table: Table, mapping: Mapping, platformName: string, newId: () => string): ImportResult {
  const byName = new Map<string, { ad: Ad; rows: number }>();
  let skipped = 0;
  let badCells = 0;
  let totalReach: number | null = null;
  const order: string[] = [];

  for (const row of table.rows) {
    const name = mapping.name !== null ? (row[mapping.name] ?? "").trim() : "";
    const firstCell = row.find((c) => c.trim()) ?? "";
    const values: Values = {};
    for (const k of RAW_KEYS) {
      const col = mapping.metrics[k];
      if (col === null) continue;
      const cell = row[col] ?? "";
      const v = parseCell(cell);
      if (v === null) {
        if (cell.trim() && !/^[-–—]+$/.test(cell.trim())) badCells++;
        continue;
      }
      if (v >= 0) values[k] = v;
    }
    if (TOTAL.test(name) || TOTAL.test(firstCell)) {
      if (isFinite(values.reach ?? NaN)) totalReach = values.reach as number;
      skipped++;
      continue;
    }
    if (!name || !Object.keys(values).length) {
      skipped++;
      continue;
    }
    const key = name.toLowerCase();
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, { ad: { id: newId(), name: name.slice(0, 160), values }, rows: 1 });
      order.push(key);
    } else {
      prev.rows++;
      for (const k of RAW_KEYS) {
        const v = values[k];
        if (typeof v === "number") prev.ad.values[k] = (prev.ad.values[k] ?? 0) + v;
      }
    }
  }

  let merged = 0;
  const ads = order.map((k) => {
    const e = byName.get(k)!;
    if (e.rows > 1) {
      merged++;
      delete e.ad.values.reach;
    }
    return e.ad;
  });
  const platform: PlatformRow = { id: newId(), name: platformName.trim().slice(0, 60), values: {}, ads: ads.slice(0, MAX_ADS) };
  const reachFromTotal = totalReach !== null && mapping.metrics.reach !== null;
  if (reachFromTotal) platform.values.reach = totalReach as number;
  return { platform, ads: platform.ads.length, skipped, merged, reachFromTotal, badCells, dropped: Math.max(0, ads.length - MAX_ADS) };
}
