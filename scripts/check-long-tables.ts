/**
 * Kontroll av långa tabeller: bygger statistiksidor av olika storlek (också med
 * långa namn som bryts på flera rader), renderar dem i Chrome och kontrollerar
 * att tabellen och fotnoterna aldrig når ner i sidfoten på någon sida.
 * Kör: npx tsx scripts/check-long-tables.ts
 */
import puppeteer from "puppeteer-core";
import type { ReportDoc } from "../src/lib/report/doc";
import { renderDocument } from "../src/lib/report/render";
import { FONT_LINK, PAGE_CSS } from "../src/lib/report/css";
import { sampleDoc } from "../src/lib/report/sample";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/** Sidfotens linje ligger 30 px + 12 px + text från sidans botten; innehållet får gå till 794 − 84. */
const LIMIT = 794 - 84 + 2;

function makeDoc(platforms: number, ads: number, longNames: boolean): ReportDoc {
  const doc = sampleDoc();
  const s = doc.sections[3];
  if (s.type !== "stats") throw new Error("exemplet har ändrats");
  s.kpis = ["spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm", "conversions", "cpa"];
  s.platforms = Array.from({ length: platforms }, (_, i) => ({
    id: `p${i}`,
    name: longNames && i % 2 ? `Plattform med ett mycket långt namn nummer ${i}` : ["Meta", "TikTok", "LinkedIn", "Snapchat", "Google Ads", "YouTube", "Pinterest"][i % 7],
    values: {},
    ads: Array.from({ length: ads }, (_, j) => ({
      id: `a${i}-${j}`,
      name: longNames && j % 3 === 0 ? `Annons ${j} med ett riktigt långt namn som garanterat bryts på två eller fler rader i tabellen` : `Annons ${j}`,
      values: { spend: 1000 + j, impressions: 50000, reach: 20000, clicks: 500, conversions: j % 4 ? 10 : 0 },
    })),
  }));
  doc.sections = [doc.sections[0], s, doc.sections[5]];
  return doc;
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1123, height: 794 });
  let failed = 0;
  for (const [P, A, long] of [[3, 2, false], [4, 6, false], [6, 8, false], [10, 10, false], [5, 9, true], [12, 15, true], [1, 40, true]] as const) {
    await page.setContent(renderDocument(makeDoc(P, A, long), PAGE_CSS, FONT_LINK), { waitUntil: "load" });
    await page.evaluate("document.fonts.ready");
    const res = (await page.evaluate(`(() => [...document.querySelectorAll('.rp-page.rp-stats')].map((pg) => {
      const top = pg.getBoundingClientRect().top;
      const t = pg.querySelector('.rp-st'); const n = pg.querySelector('.rp-st-notes');
      const bottom = Math.max(t ? t.getBoundingClientRect().bottom : 0, n ? n.getBoundingClientRect().bottom : 0) - top;
      return { bottom: Math.round(bottom), title: pg.querySelector('.rp-pg-title').textContent, total: !!pg.querySelector('.rp-st-total'), num: pg.querySelector('.rp-pg-foot b').textContent, fill: Math.round(bottom) };
    }))()`)) as { bottom: number; title: string; total: boolean; num: string }[];
    const over = res.filter((r) => r.bottom > LIMIT);
    failed += over.length;
    console.log(`${P} plattformar × ${A} annonser${long ? " (långa namn)" : ""}: ${res.length} sidor, längst ner ${res.map((r) => r.bottom).join("/")} px av ${LIMIT}, sidnr ${res.map((r) => r.num).join(",")}, totalrad på sida ${res.findIndex((r) => r.total) + 1}${over.length ? "  ← FÖR LÅNG" : ""}`);
  }
  await browser.close();
  if (failed) { console.error(`${failed} sidor för långa`); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
