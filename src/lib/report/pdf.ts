import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import type { ReportDoc } from "./doc";
import { FONT_LINK, PAGE_CSS, PAGE_H, PAGE_W } from "./css";
import { renderDocument } from "./render";

/**
 * Rapporten som riktig PDF: en sida per sektion, A4 liggande, med text som går
 * att markera och söka i. Samma HTML och CSS som editorn (renderDocument), så
 * PDF:en ser ut som förhandsvisningen. Servern bygger HTML:en själv och
 * ger den till Chromium, som alltså aldrig behöver logga in någonstans.
 */

/** Lokalt används installerad Chrome; på Vercel paketets Chromium. */
const LOCAL_CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function launch(): Promise<Browser> {
  const local = process.platform === "darwin" || process.env.CHROME_PATH ? LOCAL_CHROME : null;
  if (local && existsSync(local)) return puppeteer.launch({ executablePath: local, headless: true });
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: "shell",
    args: puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
  });
}

/** Det enda sidan får hämta utifrån är typsnittet. Allt annat, inklusive loggor, ligger i HTML:en som data. */
const ALLOWED = /^(data:|about:|https:\/\/fonts\.(googleapis|gstatic)\.com\/)/;

export interface PdfResult {
  pdf: Uint8Array;
  /** Falskt om typsnittet REM inte gick att hämta och en reservfont användes. */
  fontOk: boolean;
}

export async function renderPdf(doc: ReportDoc): Promise<PdfResult> {
  const html = renderDocument(doc, PAGE_CSS, FONT_LINK);
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => (ALLOWED.test(req.url()) ? req.continue() : req.abort()));
    // Sidorna är statiska och all text är escapad, så inga skript behövs.
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: PAGE_W, height: PAGE_H });
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    await page.evaluate("document.fonts.ready");
    const fontOk = (await page.evaluate("document.fonts.check('700 16px REM')")) === true;
    const pdf = await page.pdf({ width: `${PAGE_W}px`, height: `${PAGE_H}px`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
    return { pdf, fontOk };
  } finally {
    await browser.close();
  }
}
