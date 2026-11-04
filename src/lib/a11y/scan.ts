import { existsSync } from "node:fs";
import axe from "axe-core";
import sv from "axe-core/locales/sv.json";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { pickSubpages, SiteError } from "@/lib/audit/crawl";
import { startSafeProxy } from "./proxy";
import type { PageScan, RawViolation } from "./score";
import { WCAG_TAGS } from "./wcag";

/**
 * Tillgänglighetsgranskning i en riktig webbläsare. Sidan renderas i
 * Chromium så att färger, storlekar och skript är med, och axe-core körs i
 * sidan. Startsidan plus ett urval undersidor, samma urval som SEO-auditen.
 */

const MAX_PAGES = 8;
const CONCURRENCY = 2;
const NAV_TIMEOUT_MS = 25_000;
/** Efter så här lång tid påbörjas inga nya sidor. */
const BUDGET_MS = 150_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 MilouAudit/1.0 (+https://milou.se)";

const bareHost = (u: URL) => u.hostname.replace(/^www\./, "");
const pathKey = (u: URL) => u.pathname.replace(/\/+$/, "") || "/";

/** Lokalt används installerad Chrome; på Vercel paketets Chromium. */
const LOCAL_CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function launch(proxyPort: number): Promise<Browser> {
  const local = process.platform === "darwin" || process.env.CHROME_PATH ? LOCAL_CHROME : null;
  const guard = [
    // All trafik går via proxyn, också till localhost, som Chrome annars släpper förbi.
    `--proxy-server=http://127.0.0.1:${proxyPort}`,
    "--proxy-bypass-list=<-loopback>",
    "--disable-quic",
    "--webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--force-webrtc-ip-handling-policy",
  ];
  if (local && existsSync(local)) {
    return puppeteer.launch({ executablePath: local, headless: true, args: guard });
  }
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: "shell",
    args: puppeteer.defaultArgs({ args: [...chromium.args, ...guard], headless: "shell" }),
  });
}

/**
 * Körs inne i den granskade sidan. Skickas som text, inte som funktion, så
 * att ingen hjälpkod från byggverktyget (som esbuilds __name) följer med in
 * i sidan där den inte finns.
 */
const IN_PAGE = `async (locale, tags) => {
  const a = window.axe;
  a.configure({ locale });
  const r = await a.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] });
  const clip = (s, n) => (s || "").replace(/\\s+/g, " ").slice(0, n);
  // Länkar i meny och sidhuvud först, som i SEO-auditens urval.
  const anchors = [...document.querySelectorAll("nav a[href], header a[href]"), ...document.querySelectorAll("a[href]")];
  return {
    title: document.title,
    links: anchors.map((el) => el.href).slice(0, 400),
    passes: r.passes.length,
    violations: r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      tags: v.tags,
      help: v.help,
      description: v.description,
      helpUrl: v.helpUrl,
      count: v.nodes.length,
      examples: v.nodes.slice(0, 3).map((n) => {
        // Färgerna som axe mätte, för att kunna räkna fram en godkänd färg.
        const d = v.id === "color-contrast" && n.any && n.any[0] ? n.any[0].data : null;
        return {
          target: clip(Array.isArray(n.target) ? n.target.join(" ") : String(n.target), 200),
          html: clip(n.html, 300),
          summary: clip(n.failureSummary, 500),
          contrast: d && d.fgColor && d.bgColor
            ? { fg: String(d.fgColor), bg: String(d.bgColor), ratio: parseFloat(d.contrastRatio), expected: parseFloat(d.expectedContrastRatio) }
            : undefined,
        };
      }),
    })),
    incomplete: r.incomplete.map((v) => ({ id: v.id, help: v.help, count: v.nodes.length })),
  };
}`;

interface InPageResult {
  title: string;
  links: string[];
  passes: number;
  violations: RawViolation[];
  incomplete: { id: string; help: string; count: number }[];
}

interface ScanResult extends PageScan {
  finalUrl: string;
  links: string[];
}

async function scanPage(browser: Browser, url: URL): Promise<ScanResult> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent({ userAgent: USER_AGENT });
    page.setDefaultTimeout(NAV_TIMEOUT_MS);
    // Hindrar sidan från att öppna dialoger som stoppar granskningen.
    page.on("dialog", (d) => d.dismiss().catch(() => {}));

    let response;
    try {
      response = await page.goto(url.toString(), { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    } catch (err) {
      // Sidor som aldrig blir helt klara (spårning, chattwidgetar) granskas ändå
      // om dokumentet hann laddas.
      if (!(err instanceof Error && err.name === "TimeoutError")) throw err;
      const ready = await page.evaluate(() => document.readyState).catch(() => "loading");
      if (ready === "loading") throw new SiteError("TIMEOUT");
    }
    const status = response?.status() ?? 200;
    // Ge skript som bygger sidan en stund att bli klara.
    await new Promise((r) => setTimeout(r, 1200));

    await page.evaluate(axe.source);
    const result = (await page.evaluate(`(${IN_PAGE})(${JSON.stringify(sv)}, ${JSON.stringify(WCAG_TAGS)})`)) as InPageResult;

    return {
      url: page.url(),
      finalUrl: page.url(),
      status,
      title: result.title,
      links: result.links,
      passes: result.passes,
      violations: result.violations,
      incomplete: result.incomplete,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

export interface SiteScan {
  finalUrl: string;
  pages: PageScan[];
}

export async function scanSite(start: URL): Promise<SiteScan> {
  const began = Date.now();
  const proxy = await startSafeProxy();
  let browser: Browser | null = null;
  try {
    try {
      browser = await launch(proxy.port);
    } catch (err) {
      console.error("a11y browser launch failed", err);
      throw new SiteError("BROWSER_ERROR");
    }

    let home: ScanResult;
    try {
      home = await scanPage(browser, start);
    } catch (err) {
      if (err instanceof SiteError) throw err;
      const msg = err instanceof Error ? err.message : "";
      console.warn("a11y home failed", msg);
      throw new SiteError(/ERR_TUNNEL|ERR_PROXY|ERR_EMPTY_RESPONSE/.test(msg) ? "BLOCKED_HOST" : /timeout/i.test(msg) ? "TIMEOUT" : "NETWORK");
    }
    if (home.status >= 400) throw new SiteError("SITE_ERROR");

    const homeUrl = new URL(home.finalUrl);
    const targets = pickSubpages(homeUrl, home.links, [], []).slice(0, MAX_PAGES - 1);
    const pages: ScanResult[] = [home];
    const queue = [...targets];
    const b = browser;
    const worker = async () => {
      while (queue.length && Date.now() - began < BUDGET_MS) {
        const target = queue.shift()!;
        try {
          const res = await scanPage(b, target);
          if (res.status >= 400) continue;
          const final = new URL(res.finalUrl);
          if (bareHost(final) !== bareHost(homeUrl)) continue;
          if (pages.some((p) => pathKey(new URL(p.url)) === pathKey(final))) continue;
          pages.push(res);
        } catch (err) {
          // En undersida som inte går att ladda hoppas över.
          console.warn("a11y page failed", target.toString(), err instanceof Error ? err.message : err);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Samma ordning varje gång: startsidan först, sedan urvalsordningen.
    const order = new Map(targets.map((t, i) => [pathKey(t), i]));
    pages.sort((a, c) =>
      a === home ? -1 : c === home ? 1 : (order.get(pathKey(new URL(a.url))) ?? 99) - (order.get(pathKey(new URL(c.url))) ?? 99),
    );

    return {
      finalUrl: home.finalUrl,
      pages: pages.map(({ url, title, status, violations, incomplete, passes }) => ({ url, title, status, violations, incomplete, passes })),
    };
  } finally {
    await browser?.close().catch(() => {});
    await proxy.close();
  }
}
