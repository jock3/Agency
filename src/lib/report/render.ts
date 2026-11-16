import type { ReportDoc, Section } from "./doc";
import { logoKey, SECTION_TYPES } from "./doc";
import { effRaw, fmt, fmtPlain, isNum, kpiValue, KPIS, neededRaw, sortKpis, type KpiKey } from "./kpis";
import { budgetByPlatform, insights, summaryTiles, allRows, type StatsLike } from "./summary";

/**
 * Rapportsidorna som HTML-strängar. Rena funktioner utan webbläsarkod, så att
 * editorn, miniatyrerna och PDF-sidan (som byggs på servern och renderas av
 * Chromium) använder exakt samma kod. All text från dokumentet går genom esc().
 * Klasserna har prefixet rp- och stilarna finns i css.ts.
 */

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const initial = (name: string) => (String(name ?? "").trim()[0] || "?").toUpperCase();

/** Logotyp som ruta. Logotypen är en validerad PNG som data-URL (se normalizeDoc). */
function logoTile(doc: ReportDoc, name: string, small = false): string {
  const src = name ? doc.logos[logoKey(name)] : undefined;
  const cls = `rp-pl-logo${small ? " rp-sm" : ""}`;
  return src ? `<span class="${cls}"><img src="${esc(src)}" alt=""></span>` : `<span class="${cls}">${esc(initial(name))}</span>`;
}

function foot(doc: ReportDoc, idx: number): string {
  const m = doc.meta;
  return `<div class="rp-pg-foot"><span>${esc([m.client, m.campaign].filter(Boolean).join(" · "))}</span><span>${esc(m.agency || "")}<b>${idx + 1}</b></span></div>`;
}
const wrap = (doc: ReportDoc, inner: string, idx: number, cls: string) => `<div class="rp-page rp-${cls}">${inner}${foot(doc, idx)}</div>`;

function pgHead(eyebrow: string, title: string, sub?: string, right?: string): string {
  return `<header class="rp-pg-head"><div><div class="rp-pg-eyebrow">${esc(eyebrow)}</div><h2 class="rp-pg-title">${esc(title)}</h2>${sub ? `<p class="rp-pg-sub">${esc(sub)}</p>` : ""}</div>${right || ""}</header>`;
}

function cover(doc: ReportDoc, sec: Extract<Section, { type: "cover" }>): string {
  const m = doc.meta;
  return `<div class="rp-page rp-cover"><div class="rp-cv-ring rp-r1"></div><div class="rp-cv-ring rp-r2"></div><div class="rp-cv-dot"></div>
    <div class="rp-cv-top"><span>${esc(m.agency)}</span><span>${esc(m.date)}</span></div>
    <div class="rp-cv-main">${sec.subtitle ? `<div class="rp-cv-kicker">${esc(sec.subtitle)}</div>` : ""}
      <h1 class="rp-cv-client">${esc(m.client || "Kundnamn")}</h1>
      <div class="rp-cv-campaign">${esc(m.campaign || "Kampanjnamn")}</div>
      ${m.period ? `<div><span class="rp-cv-period">${esc(m.period)}</span></div>` : ""}
    </div></div>`;
}

function kpiPage(doc: ReportDoc, sec: Extract<Section, { type: "kpi" }>, idx: number): string {
  const ks = sortKpis(sec.kpis);
  let inner = pgHead("KPI:er", sec.heading || "Det här mäter vi", sec.intro);
  if (!ks.length) return wrap(doc, inner + '<div class="rp-pg-empty">Välj vilka KPI:er rapporten ska utgå från.</div>', idx, "kpi");
  const n = ks.length;
  const cols = n === 4 ? 4 : n <= 9 ? 3 : 4;
  inner += `<div class="rp-kpi-grid${n > 12 ? " rp-dense" : ""}" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${ks
    .map((k) => {
      const d = KPIS[k];
      const desc = typeof sec.descs[k] === "string" ? (sec.descs[k] as string) : d.desc;
      return `<div class="rp-kpi-card"><div class="rp-kpi-abbr">${esc(d.abbr || d.name)}</div>${d.abbr ? `<div class="rp-kpi-name">${esc(d.name)}</div>` : ""}<p class="rp-kpi-desc">${esc(desc)}</p>${
        d.formula ? `<span class="rp-kpi-formula">${esc(d.formula)}</span>` : '<span class="rp-kpi-formula rp-raw">Hämtas från plattformen</span>'
      }</div>`;
    })
    .join("")}</div>`;
  return wrap(doc, inner, idx, "kpi");
}

/* Uppmätta höjder i Chrome (px), för att dela långa tabeller på flera sidor. */
const ROW = {
  normal: { thead: 25, plat: 56, ad: 40, total: 40 },
  compact: { thead: 25, plat: 42, ad: 28, total: 28 },
  /** Extra höjd per ytterligare textrad i första kolumnen. */
  extraLine: { plat: 18, ad: 17 },
};
/** Ungefär så många tecken får plats per rad i första kolumnen (300 px). */
const CHARS = { plat: 22, ad: 32 };
/** Höjden tabellen får ta på en sida. Sista sidan behöver dessutom plats för fotnoterna. */
const TABLE_BUDGET = 525;
const NOTES_RESERVE = 55;
const lines = (text: string, perLine: number) => Math.max(1, Math.ceil(text.length / perLine));

interface TableRow {
  kind: "plat" | "ad" | "cont";
  html: string;
  h: number;
  /** Plattformens namn, för fortsättningsraden. */
  platform: string;
  /** Plattformens index; rader med samma index hör ihop. */
  pi: number;
}

/**
 * Statistiksidan. Får tabellen inte plats blir den först kompakt, och räcker
 * inte det fortsätter den på nya sidor med rubriken "(forts.)". Delas en
 * plattforms annonser upp står plattformens namn med "(forts.)" överst på
 * nästa sida. Totalraden och fotnoterna står på sista sidan.
 */
function statsPages(doc: ReportDoc, sec: Extract<Section, { type: "stats" }>, idx: number): string[] {
  const ks = sortKpis(sec.kpis);
  const P = sec.platforms.length;
  const A = sec.platforms.reduce((a, p) => a + p.ads.length, 0);
  const showAds = sec.showAds !== false;
  const badge = `<div class="rp-pg-badge">${P} ${P === 1 ? "plattform" : "plattformar"} · ${A} ${A === 1 ? "annons" : "annonser"}</div>`;
  const title = sec.title || "Namnlös kampanj";
  const head = (n: number) => pgHead("Statistik", n === 0 ? title : `${title} (forts.)`, sec.subtitle, badge);
  if (!ks.length) return [wrap(doc, head(0) + '<div class="rp-pg-empty">Välj vilka KPI:er som ska visas som kolumner.</div>', idx, "stats")];
  if (!P) return [wrap(doc, head(0) + '<div class="rp-pg-empty">Lägg till en plattform för att fylla tabellen.</div>', idx, "stats")];

  let missing = false;
  const cell = (k: KpiKey, v: number | null) => {
    if (!isNum(v)) missing = true;
    return `<td>${fmt(k, v)}</td>`;
  };
  const rows: TableRow[] = [];
  sec.platforms.forEach((p, pi) => {
    const r = effRaw(p);
    const name = p.name || "Namnlös plattform";
    rows.push({ kind: "plat", pi, platform: name, h: 0, html: `<tr class="rp-st-plat"><td><div class="rp-pl-cell">${logoTile(doc, p.name)}<span>${esc(name)}</span></div></td>${ks.map((k) => cell(k, kpiValue(k, [r]))).join("")}</tr>` });
    if (showAds) {
      for (const a of p.ads) {
        const an = a.name || "Namnlös annons";
        rows.push({ kind: "ad", pi, platform: name, h: lines(an, CHARS.ad), html: `<tr class="rp-st-ad"><td><span class="rp-ad-dot"></span>${esc(an)}</td>${ks.map((k) => cell(k, kpiValue(k, [a.values]))).join("")}</tr>` });
      }
    }
  });
  for (const r of rows) if (r.kind === "plat") r.h = lines(r.platform, CHARS.plat);
  const effAll = sec.platforms.map(effRaw);
  const totalRow = P > 1 ? `<tr class="rp-st-total"><td>Totalt</td>${ks.map((k) => cell(k, kpiValue(k, effAll))).join("")}</tr>` : "";
  const need = neededRaw(ks);
  const notes: string[] = [];
  if (P > 1 && ks.some((k) => k === "reach" || k === "frequency")) notes.push("Räckvidd i totalraden summeras per plattform och kan innehålla överlapp mellan kanaler.");
  if (showAds && sec.platforms.some((p) => p.ads.length && need.some((m) => isNum(p.values[m])))) notes.push("Plattformsraderna summerar annonserna, utom där värdet hämtats direkt från plattformen.");
  if (missing) notes.push("– betyder att data saknas eller inte går att räkna ut.");
  const notesHtml = notes.length ? `<p class="rp-st-notes">${notes.map(esc).join(" ")}</p>` : "";
  const thead = `<thead><tr><th style="width:300px">Plattform${showAds && A ? " / annons" : ""}</th>${ks.map((k) => `<th>${esc(KPIS[k].col)}</th>`).join("")}</tr></thead>`;
  const table = (body: string, compact: boolean, withTotal: boolean) =>
    `<table class="rp-st${compact ? " rp-compact" : ""}">${thead}<tbody>${body}</tbody>${withTotal && totalRow ? `<tfoot>${totalRow}</tfoot>` : ""}</table>`;

  // Samma regel som prototypen för när tabellen blir kompakt.
  const estHeight = 40 + P * 55 + (showAds ? A : 0) * 39 + (P > 1 ? 44 : 0);
  const height = (r: TableRow, mode: "normal" | "compact") => (r.kind === "ad" ? ROW[mode].ad + (r.h - 1) * ROW.extraLine.ad : ROW[mode].plat + (r.h - 1) * ROW.extraLine.plat);
  const compactTotal = ROW.compact.thead + rows.reduce((a, r) => a + height(r, "compact"), 0) + (totalRow ? ROW.compact.total : 0);
  const notesReserve = notes.length ? NOTES_RESERVE : 0;
  if (estHeight <= 470 || compactTotal + notesReserve <= TABLE_BUDGET) {
    return [wrap(doc, head(0) + table(rows.map((r) => r.html).join(""), estHeight > 470, true) + notesHtml, idx, "stats")];
  }

  // Dela upp i kompakt läge. En plattformsrad lämnas aldrig ensam längst ner,
  // och en sida som fortsätter en plattforms annonser börjar med plattformens namn.
  const pages: TableRow[][] = [];
  let page: TableRow[] = [];
  let used = ROW.compact.thead;
  const start = () => {
    pages.push(page);
    page = [];
    used = ROW.compact.thead;
  };
  rows.forEach((r, k) => {
    const h = height(r, "compact");
    const isLast = k === rows.length - 1;
    const next = rows[k + 1];
    // En plattformsrad behöver plats för sin första annons på samma sida.
    const keep = r.kind === "plat" && next?.kind === "ad" && next.pi === r.pi ? height(next, "compact") : 0;
    const reserve = isLast ? (totalRow ? ROW.compact.total : 0) + notesReserve : 0;
    if (page.length && used + h + keep + reserve > TABLE_BUDGET) {
      start();
      if (r.kind === "ad") {
        const cont: TableRow = { kind: "cont", pi: r.pi, platform: r.platform, h: 1, html: `<tr class="rp-st-plat rp-st-cont"><td><div class="rp-pl-cell">${logoTile(doc, r.platform)}<span>${esc(r.platform)} (forts.)</span></div></td>${ks.map(() => "<td></td>").join("")}</tr>` };
        page.push(cont);
        used += ROW.compact.plat;
      }
    }
    page.push(r);
    used += h;
  });
  // Får totalraden inte plats på sista sidan hamnar den ensam på en egen.
  if (page.length) pages.push(page);
  return pages.map((rs, n) => {
    const last = n === pages.length - 1;
    return wrap(doc, head(n) + table(rs.map((r) => r.html).join(""), true, last) + (last ? notesHtml : ""), idx + n, "stats");
  });
}

/** Tom rad ger nytt stycke. Rader som börjar med "- " blir punkter. */
export function richText(t: string): string {
  return String(t || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => {
      let out = "";
      let para: string[] = [];
      let list: string[] = [];
      const flushP = () => {
        if (para.length) out += `<p>${para.map(esc).join("<br>")}</p>`;
        para = [];
      };
      const flushL = () => {
        if (list.length) out += `<ul>${list.map((x) => `<li><span class="rp-d"></span>${esc(x)}</li>`).join("")}</ul>`;
        list = [];
      };
      for (const l of block.split("\n")) {
        const m = l.match(/^\s*[-•]\s+(.*)$/);
        if (m) {
          flushP();
          list.push(m[1]);
        } else if (l.trim()) {
          flushL();
          para.push(l.trim());
        }
      }
      flushP();
      flushL();
      return out;
    })
    .join("");
}

function commentPage(doc: ReportDoc, sec: Extract<Section, { type: "comment" }>, idx: number): string {
  const inner = `<div class="rp-cm-side">${sec.label ? `<div class="rp-pg-eyebrow">${esc(sec.label)}</div>` : ""}<h2 class="rp-cm-title">${esc(sec.heading || "Rubrik")}</h2></div>
    <div class="rp-cm-body">${richText(sec.body) || '<p style="color:#AAAAAA">Skriv er kommentar i panelen till höger.</p>'}</div>`;
  return wrap(doc, inner, idx, "comment");
}

const statsOf = (doc: ReportDoc): (StatsLike & { id: string })[] =>
  doc.sections.filter((s): s is Extract<Section, { type: "stats" }> => s.type === "stats").map((s) => ({ id: s.id, title: s.title, platforms: s.platforms }));

function summaryPage(doc: ReportDoc, sec: Extract<Section, { type: "summary" }>, idx: number): string {
  const stats = statsOf(doc);
  const ks = sortKpis(sec.kpis);
  const sub = [`${stats.length} ${stats.length === 1 ? "kampanj" : "kampanjer"}`, doc.meta.period].filter(Boolean).join(" · ");
  let inner = pgHead("Sammanfattning", sec.heading || "Sammanfattning", sub);
  if (!stats.length) return wrap(doc, inner + '<div class="rp-pg-empty">Lägg till en statistiksida så fylls sammanfattningen i automatiskt.</div>', idx, "summary");

  const all = allRows(stats);
  if (sec.showTiles !== false) {
    const tiles = summaryTiles(stats);
    if (tiles.length) {
      inner += `<div class="rp-sm-tiles">${tiles
        .map((t, i) => `<div class="rp-sm-tile${i === 0 ? " rp-hero" : ""}"><div class="rp-sm-tile-l">${esc(KPIS[t.key].name)}</div><div class="rp-sm-tile-v">${fmt(t.key, t.value)}</div></div>`)
        .join("")}</div>`;
    }
  }
  if (ks.length) {
    inner += `<table class="rp-st"><thead><tr><th style="width:260px">Kampanj</th>${ks.map((k) => `<th>${esc(KPIS[k].col)}</th>`).join("")}</tr></thead><tbody>${stats
      .map((s) => {
        const rows = s.platforms.map(effRaw);
        return `<tr class="rp-st-row"><td>${esc(s.title || "Namnlös kampanj")}</td>${ks.map((k) => `<td>${fmt(k, kpiValue(k, rows))}</td>`).join("")}</tr>`;
      })
      .join("")}</tbody>${
      stats.length > 1 ? `<tfoot><tr class="rp-st-total"><td>Totalt</td>${ks.map((k) => `<td>${fmt(k, kpiValue(k, all))}</td>`).join("")}</tr></tfoot>` : ""
    }</table>`;
  }

  const cols: string[] = [];
  if (sec.showBudget !== false) {
    const b = budgetByPlatform(stats);
    if (b.length) {
      cols.push(
        `<div><h3 class="rp-sm-h">Budget per plattform</h3>${b
          .map(
            (e) =>
              `<div class="rp-bar-row"><div class="rp-bar-top"><span class="rp-bar-name">${logoTile(doc, e.name, true)}${esc(e.name)}</span><span>${fmt("spend", e.value)} · ${e.share}&nbsp;%</span></div><div class="rp-bar-track"><div class="rp-bar-fill" style="width:${(e.w * 100).toFixed(1)}%"></div></div></div>`,
          )
          .join("")}</div>`,
      );
    }
  }
  const ins = sec.showInsights !== false ? insights(stats) : [];
  if (ins.length || sec.conclusion) {
    cols.push(
      `<div>${
        ins.length ? `<h3 class="rp-sm-h">Höjdpunkter</h3><ul class="rp-ins">${ins.map((x) => `<li><span class="rp-ins-dot"></span><span><b>${esc(x.name)}</b> ${esc(x.text)}</span></li>`).join("")}</ul>` : ""
      }${sec.conclusion ? `<p class="rp-sm-concl">${esc(sec.conclusion)}</p>` : ""}</div>`,
    );
  }
  if (cols.length) inner += `<div class="rp-sm-bottom" style="grid-template-columns:${cols.length === 2 ? "1fr 1.25fr" : "1fr"}">${cols.join("")}</div>`;
  return wrap(doc, inner, idx, "summary");
}

/**
 * Sidorna för en sektion. firstPage är sektionens första sidindex i hela
 * rapporten (0-baserat) och styr sidnumren. En statistiksida med lång tabell
 * kan bli flera sidor; övriga sektioner är alltid en sida.
 */
export function renderSection(doc: ReportDoc, idx: number, firstPage: number): string[] {
  const sec = doc.sections[idx];
  if (!sec) return [];
  switch (sec.type) {
    case "cover": return [cover(doc, sec)];
    case "kpi": return [kpiPage(doc, sec, firstPage)];
    case "stats": return statsPages(doc, sec, firstPage);
    case "comment": return [commentPage(doc, sec, firstPage)];
    case "summary": return [summaryPage(doc, sec, firstPage)];
  }
}

/** Alla sidor i rapporten, per sektion, med rätt sidnummer. */
export function renderAll(doc: ReportDoc): { first: number; pages: string[] }[] {
  const out: { first: number; pages: string[] }[] = [];
  let next = 0;
  for (let i = 0; i < doc.sections.length; i++) {
    const pages = renderSection(doc, i, next);
    out.push({ first: next, pages });
    next += pages.length;
  }
  return out;
}

/** Sektionens första sida, med rätt sidnummer. Används av miniatyrerna. */
export function renderPage(doc: ReportDoc, idx: number): string {
  return renderAll(doc)[idx]?.pages[0] ?? "";
}

export function slideLabel(sec: Section): string {
  const t = SECTION_TYPES[sec.type].name;
  const extra = sec.type === "stats" ? sec.title : sec.type === "comment" ? sec.heading : "";
  return extra ? `${t} · ${extra}` : t;
}

/** Hela rapporten som ett HTML-dokument, en .rp-page per sida. Används av PDF-exporten och skärmbildsskriptet. */
export function renderDocument(doc: ReportDoc, css: string, fontLink: string): string {
  const pages = renderAll(doc).flatMap((s) => s.pages).join("\n");
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>${esc(`Rapport ${doc.meta.client} ${doc.meta.campaign}`.trim())}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${esc(fontLink)}" rel="stylesheet">
<style>@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0}.rp-page{break-after:page;page-break-after:always}.rp-page:last-child{break-after:auto;page-break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}${css}</style></head><body>${pages}</body></html>`;
}

export { fmtPlain };
