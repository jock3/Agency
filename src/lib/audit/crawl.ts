import { aggregate, analyzePage, disallowedPrefixes, siteChecks, sitemapUrls, type PageResult } from "./checks";
import { FetchError, normalizeUrl, safeFetch, tryFetch, type FetchResult } from "./fetch";
import type { AuditedPage, Check, PageExtract } from "./types";

/**
 * Granskar en sajt, inte bara en sida. Startsidan hämtas först; därefter ett
 * urval undersidor — menylänkar i första hand, sedan sitemap — med en fast
 * tidsbudget så att hela körningen ryms i funktionens maxDuration.
 */

const MAX_PAGES = 10;
const PER_SECTION = 2;
const CONCURRENCY = 4;
const SUBPAGE_TIMEOUT_MS = 8_000;
/** Efter så här lång tid påbörjas inga nya hämtningar. */
const BUDGET_MS = 25_000;

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|svg|webp|avif|ico|zip|mp4|mov|mp3|docx?|xlsx?|pptx?|xml|json|txt|css|js)$/i;
const SKIP_PATH = /\/(wp-admin|wp-login|wp-json|feed|cart|checkout|kassa|varukorg|login|logga-in|my-account|mitt-konto|cdn-cgi)(\/|$)/i;

export class SiteError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const bareHost = (u: URL) => u.hostname.replace(/^www\./, "");
const pathKey = (u: URL) => u.pathname.replace(/\/+$/, "") || "/";
const section = (u: URL) => u.pathname.split("/").filter(Boolean)[0] ?? "";

const isHtml = (res: FetchResult) => {
  const type = String(res.headers["content-type"] ?? "");
  return !type || type.includes("html");
};

async function sitemapLocs(origin: string, robotsTxt: string | null): Promise<{ found: boolean; locs: string[] }> {
  const candidates = sitemapUrls(robotsTxt);
  if (candidates.length === 0) candidates.push(new URL("/sitemap.xml", origin).toString());
  const read = async (url: string) => {
    try {
      const res = await tryFetch(normalizeUrl(url), SUBPAGE_TIMEOUT_MS);
      return res && /<(urlset|sitemapindex)/i.test(res.body) ? res.body : null;
    } catch {
      return null;
    }
  };
  const locsOf = (xml: string) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)/gi)].map((m) => m[1]);

  const first = await read(candidates[0]);
  if (!first) return { found: sitemapUrls(robotsTxt).length > 0, locs: [] };
  if (!/<sitemapindex/i.test(first)) return { found: true, locs: locsOf(first).slice(0, 500) };
  // Ett sitemapindex pekar på delsitemaps. De två första räcker för ett urval.
  const children = await Promise.all(locsOf(first).slice(0, 2).map(read));
  return { found: true, locs: children.flatMap((xml) => (xml ? locsOf(xml) : [])).slice(0, 500) };
}

function pickSubpages(home: URL, links: string[], sitemap: string[], disallowed: string[]): URL[] {
  const chosen: URL[] = [];
  const seen = new Set([pathKey(home)]);
  const perSection = new Map<string, number>();

  const consider = (raw: string) => {
    if (chosen.length >= MAX_PAGES - 1) return;
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") return;
    if (bareHost(u) !== bareHost(home)) return;
    if (u.search || SKIP_EXT.test(u.pathname) || SKIP_PATH.test(u.pathname)) return;
    if (disallowed.some((p) => u.pathname.startsWith(p))) return;
    const key = pathKey(u);
    if (seen.has(key)) return;
    // Högst två sidor per sektion, så urvalet inte blir nio blogginlägg.
    const s = section(u);
    if ((perSection.get(s) ?? 0) >= PER_SECTION) return;
    seen.add(key);
    perSection.set(s, (perSection.get(s) ?? 0) + 1);
    u.hash = "";
    chosen.push(u);
  };

  links.forEach(consider);
  sitemap.forEach(consider);
  return chosen;
}

export interface SiteAudit {
  finalUrl: string;
  checks: Check[];
  extract: PageExtract;
  pages: AuditedPage[];
}

export async function auditSite(start: URL): Promise<SiteAudit> {
  const began = Date.now();

  const home = await safeFetch(start);
  if (home.status >= 400) throw new SiteError("SITE_ERROR");
  if (!isHtml(home)) throw new SiteError("NOT_HTML");
  const homeUrl = new URL(home.url);
  const origin = homeUrl.origin;

  const [robots, llms] = await Promise.all([
    tryFetch(new URL("/robots.txt", origin), SUBPAGE_TIMEOUT_MS),
    tryFetch(new URL("/llms.txt", origin), SUBPAGE_TIMEOUT_MS),
  ]);
  const robotsTxt = robots?.body ?? null;
  // Många sajter svarar 200 med sin vanliga HTML-sida på okända sökvägar.
  const hasLlmsTxt = llms !== null && !/^\s*</.test(llms.body);

  const homePage = analyzePage({ url: home.url, html: home.body, ms: home.ms, status: home.status });
  const sitemap = await sitemapLocs(origin, robotsTxt);
  const targets = pickSubpages(homeUrl, homePage.links, sitemap.locs, disallowedPrefixes(robotsTxt));
  const linked = new Set(homePage.links.map((l) => pathKey(new URL(l))));

  const pages: PageResult[] = [homePage];
  const broken: { url: string; status: number }[] = [];
  let attempted = 0;
  const queue = [...targets];

  const worker = async () => {
    while (queue.length && Date.now() - began < BUDGET_MS) {
      const target = queue.shift()!;
      attempted++;
      try {
        const res = await safeFetch(target, SUBPAGE_TIMEOUT_MS);
        // Bara länkar från startsidan räknas som trasiga — en död URL i
        // sitemapen är en annan sorts fel.
        if (res.status >= 400) {
          if (linked.has(pathKey(target))) broken.push({ url: target.toString(), status: res.status });
          continue;
        }
        if (!isHtml(res) || bareHost(new URL(res.url)) !== bareHost(homeUrl)) continue;
        // Omdirigering till en sida vi redan har ska inte räknas två gånger.
        if (pages.some((p) => pathKey(new URL(p.url)) === pathKey(new URL(res.url)))) continue;
        pages.push(analyzePage({ url: res.url, html: res.body, ms: res.ms, status: res.status }));
      } catch (err) {
        if (!(err instanceof FetchError)) throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Arbetarna blir klara i godtycklig ordning. Startsidan först, sedan i
  // urvalsordning, så att sammanvägningen ger samma resultat varje gång.
  const order = new Map(targets.map((t, i) => [pathKey(t), i]));
  pages.sort((a, b) => (a === homePage ? -1 : b === homePage ? 1 : (order.get(pathKey(new URL(a.url))) ?? 99) - (order.get(pathKey(new URL(b.url))) ?? 99)));

  const site = siteChecks({ url: home.url, robotsTxt, hasSitemap: sitemap.found, hasLlmsTxt, pages, broken, attempted });
  const checks = [...site.filter((c) => c.id === "https" || c.id === "crawlable"), ...aggregate(pages), ...site.filter((c) => c.id !== "https" && c.id !== "crawlable")];

  const issuesOf = (p: PageResult) => p.checks.filter((c) => c.status !== "pass");
  return {
    finalUrl: home.url,
    checks,
    extract: {
      ...homePage.extract,
      text: homePage.extract.text.slice(0, 8_000),
      pages: pages.slice(1).map((p) => ({
        url: p.url,
        title: p.title,
        h1: p.h1,
        issues: issuesOf(p).map((c) => `${c.label}: ${c.detail}`),
        text: p.extract.text.slice(0, 1_500),
      })),
    },
    pages: pages.map((p) => ({ url: p.url, title: p.title, status: p.status, issues: issuesOf(p).length })),
  };
}
