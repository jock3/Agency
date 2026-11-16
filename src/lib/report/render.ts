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

function statsPage(doc: ReportDoc, sec: Extract<Section, { type: "stats" }>, idx: number): string {
  const ks = sortKpis(sec.kpis);
  const P = sec.platforms.length;
  const A = sec.platforms.reduce((a, p) => a + p.ads.length, 0);
  const showAds = sec.showAds !== false;
  const badge = `<div class="rp-pg-badge">${P} ${P === 1 ? "plattform" : "plattformar"} · ${A} ${A === 1 ? "annons" : "annonser"}</div>`;
  let inner = pgHead("Statistik", sec.title || "Namnlös kampanj", sec.subtitle, badge);
  if (!ks.length) return wrap(doc, inner + '<div class="rp-pg-empty">Välj vilka KPI:er som ska visas som kolumner.</div>', idx, "stats");
  if (!P) return wrap(doc, inner + '<div class="rp-pg-empty">Lägg till en plattform för att fylla tabellen.</div>', idx, "stats");

  let missing = false;
  const cell = (k: KpiKey, v: number | null) => {
    if (!isNum(v)) missing = true;
    return `<td>${fmt(k, v)}</td>`;
  };
  let body = "";
  for (const p of sec.platforms) {
    const r = effRaw(p);
    body += `<tr class="rp-st-plat"><td><div class="rp-pl-cell">${logoTile(doc, p.name)}<span>${esc(p.name || "Namnlös plattform")}</span></div></td>${ks.map((k) => cell(k, kpiValue(k, [r]))).join("")}</tr>`;
    if (showAds) {
      for (const a of p.ads) {
        body += `<tr class="rp-st-ad"><td><span class="rp-ad-dot"></span>${esc(a.name || "Namnlös annons")}</td>${ks.map((k) => cell(k, kpiValue(k, [a.values]))).join("")}</tr>`;
      }
    }
  }
  const rows = sec.platforms.map(effRaw);
  const tfoot = P > 1 ? `<tfoot><tr class="rp-st-total"><td>Totalt</td>${ks.map((k) => cell(k, kpiValue(k, rows))).join("")}</tr></tfoot>` : "";
  const need = neededRaw(ks);
  const notes: string[] = [];
  if (P > 1 && ks.some((k) => k === "reach" || k === "frequency")) notes.push("Räckvidd i totalraden summeras per plattform och kan innehålla överlapp mellan kanaler.");
  if (showAds && sec.platforms.some((p) => p.ads.length && need.some((m) => isNum(p.values[m])))) notes.push("Plattformsraderna summerar annonserna, utom där värdet hämtats direkt från plattformen.");
  if (missing) notes.push("– betyder att data saknas eller inte går att räkna ut.");
  // Kompakt läge när tabellen annars inte får plats på sidan.
  const estHeight = 40 + P * 55 + (showAds ? A : 0) * 39 + (P > 1 ? 44 : 0);
  inner += `<table class="rp-st${estHeight > 470 ? " rp-compact" : ""}"><thead><tr><th style="width:300px">Plattform${showAds && A ? " / annons" : ""}</th>${ks.map((k) => `<th>${esc(KPIS[k].col)}</th>`).join("")}</tr></thead><tbody>${body}</tbody>${tfoot}</table>${
    notes.length ? `<p class="rp-st-notes">${notes.map(esc).join(" ")}</p>` : ""
  }`;
  return wrap(doc, inner, idx, "stats");
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

/** En sida som HTML. idx är sidans plats i rapporten (0-baserad) och styr sidnumret. */
export function renderPage(doc: ReportDoc, idx: number): string {
  const sec = doc.sections[idx];
  if (!sec) return "";
  switch (sec.type) {
    case "cover": return cover(doc, sec);
    case "kpi": return kpiPage(doc, sec, idx);
    case "stats": return statsPage(doc, sec, idx);
    case "comment": return commentPage(doc, sec, idx);
    case "summary": return summaryPage(doc, sec, idx);
  }
}

export function slideLabel(sec: Section): string {
  const t = SECTION_TYPES[sec.type].name;
  const extra = sec.type === "stats" ? sec.title : sec.type === "comment" ? sec.heading : "";
  return extra ? `${t} · ${extra}` : t;
}

/** Hela rapporten som ett HTML-dokument, en .rp-page per sektion. Används av PDF-exporten och skärmbildsskriptet. */
export function renderDocument(doc: ReportDoc, css: string, fontLink: string): string {
  const pages = doc.sections.map((_, i) => renderPage(doc, i)).join("\n");
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>${esc(`Rapport ${doc.meta.client} ${doc.meta.campaign}`.trim())}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${esc(fontLink)}" rel="stylesheet">
<style>@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0}.rp-page{break-after:page;page-break-after:always}.rp-page:last-child{break-after:auto;page-break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}${css}</style></head><body>${pages}</body></html>`;
}

export { fmtPlain };
