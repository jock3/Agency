import * as cheerio from "cheerio";
import type { Check, CheckGroup, CheckStatus } from "./types";

/**
 * Fasta kontroller. Betyget kommer härifrån och inte från Claude, så samma sajt
 * får samma betyg varje gång. Claude skriver bara åtgärdstexterna.
 *
 * Kontrollerna finns i två sorter. Sidkontroller (titel, rubriker, schema …)
 * körs på varje granskad sida och vägs sedan ihop i `aggregate`. Sajtkontroller
 * (HTTPS, robots.txt, sitemap …) gäller hela domänen och körs en gång.
 *
 * Vikterna säger hur mycket en kontroll betyder inom sin grupp. SEO och GEO
 * vägs sedan lika i totalbetyget.
 */

const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"];

function check(
  id: string,
  group: CheckGroup,
  label: string,
  weight: number,
  status: CheckStatus,
  detail: string,
  fix: string,
): Check {
  return { id, group, label, weight, status, detail, fix };
}

// ── robots.txt ─────────────────────────────────────────────────────────────

interface RobotsGroup {
  agents: string[];
  disallow: string[];
}

/** Grupperna i robots.txt: en eller flera User-agent-rader följda av regler. */
function robotsGroups(robots: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let inRules = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || inRules) {
        current = { agents: [], disallow: [] };
        groups.push(current);
        inRules = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "disallow" || key === "allow") && current) {
      inRules = true;
      if (key === "disallow" && value) current.disallow.push(value);
    }
  }
  return groups;
}

/** Agenter som spärras från hela sajten ("Disallow: /"). */
function blockedAgents(robots: string): Set<string> {
  const blocked = new Set<string>();
  for (const g of robotsGroups(robots)) if (g.disallow.includes("/")) g.agents.forEach((a) => blocked.add(a));
  return blocked;
}

/** Sökvägsprefix som *-gruppen inte får besöka. Jokertecken kortas av vid
 *  första `*` — grovt, men tillräckligt för att inte crawla spärrade sidor. */
export function disallowedPrefixes(robots: string | null): string[] {
  if (!robots) return [];
  return robotsGroups(robots)
    .filter((g) => g.agents.includes("*"))
    .flatMap((g) => g.disallow)
    .map((p) => p.split("*")[0].replace(/\$$/, ""))
    .filter(Boolean);
}

export function sitemapUrls(robots: string | null): string[] {
  if (!robots) return [];
  return [...robots.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
}

function collectSchemaTypes($: cheerio.CheerioAPI): string[] {
  const types = new Set<string>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const t = record["@type"];
    if (typeof t === "string") types.add(t);
    if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
    Object.values(record).forEach(visit);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      // Trasig JSON-LD räknas som ingen.
    }
  });
  return [...types];
}

// ── Sidkontroller ──────────────────────────────────────────────────────────

export interface PageResult {
  url: string;
  status: number;
  title: string;
  h1: string;
  checks: Check[];
  /** Interna och externa länkar, menylänkar först. Används för att välja
   *  vilka undersidor som ska granskas. */
  links: string[];
}

export function analyzePage(input: { url: string; html: string; ms: number; status: number }): PageResult {
  const $ = cheerio.load(input.html);
  const checks: Check[] = [];

  const title = $("head title").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const h1Count = $("h1").length;
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2Count = $("h2").length;

  const links: string[] = [];
  const seen = new Set<string>();
  // Två varv: en kombinerad selektor ger dokumentordning, och menylänkarna
  // ska stå först eftersom de pekar på sajtens viktigaste sidor.
  for (const selector of ["nav a[href], header a[href]", "a[href]"]) {
    $(selector).each((_, el) => {
      try {
        const u = new URL($(el).attr("href")!, input.url);
        u.hash = "";
        const s = u.toString();
        if (!seen.has(s)) {
          seen.add(s);
          links.push(s);
        }
      } catch {
        // Ogiltig href.
      }
    });
  }

  // Texten läses innan skript och navigering rensas bort, så ordräkningen
  // speglar det en sökrobot ser utan att köra JavaScript.
  const body = $("body").clone();
  body.find("script, style, noscript, svg, template, iframe").remove();
  const text = body.text().replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const schemaTypes = collectSchemaTypes($);

  // SEO

  if (!title) {
    checks.push(check("title", "seo", "Sidtitel", 3, "fail", "Sidan saknar <title>.", "Ge varje sida en unik titel på 30–60 tecken som börjar med det viktigaste sökordet."));
  } else if (title.length < 20 || title.length > 65) {
    checks.push(check("title", "seo", "Sidtitel", 3, "warn", `Titeln är ${title.length} tecken: "${title}".`, "Skriv om titlarna till 30–60 tecken så de inte kapas i sökresultatet och ändå säger vad sidan handlar om."));
  } else {
    checks.push(check("title", "seo", "Sidtitel", 3, "pass", `"${title}" (${title.length} tecken).`, ""));
  }

  if (!description) {
    checks.push(check("description", "seo", "Metabeskrivning", 2, "fail", "Ingen metabeskrivning.", "Skriv en metabeskrivning på 120–160 tecken för varje viktig sida, som säljer in klicket från sökresultatet."));
  } else if (description.length < 70 || description.length > 170) {
    checks.push(check("description", "seo", "Metabeskrivning", 2, "warn", `Beskrivningen är ${description.length} tecken.`, "Justera metabeskrivningarna till 120–160 tecken."));
  } else {
    checks.push(check("description", "seo", "Metabeskrivning", 2, "pass", `${description.length} tecken.`, ""));
  }

  if (h1s.length === 1) {
    checks.push(check("h1", "seo", "Huvudrubrik (H1)", 2, "pass", `"${h1s[0].slice(0, 80)}"`, ""));
  } else if (h1s.length === 0) {
    const detail = h1Count ? "H1 finns men innehåller ingen text, till exempel bara en logotyp." : "Sidan har ingen H1.";
    checks.push(check("h1", "seo", "Huvudrubrik (H1)", 2, "fail", detail, "Ge varje sida exakt en H1 som tydligt säger vad sidan erbjuder."));
  } else {
    checks.push(check("h1", "seo", "Huvudrubrik (H1)", 2, "warn", `Sidan har ${h1s.length} H1-rubriker.`, "Behåll en H1 per sida och gör övriga till H2."));
  }

  checks.push(
    h2Count >= 2
      ? check("structure", "seo", "Rubrikstruktur", 1, "pass", `${h2Count} underrubriker (H2).`, "")
      : check("structure", "seo", "Rubrikstruktur", 1, "warn", `Bara ${h2Count} underrubriker (H2).`, "Dela upp innehållet med beskrivande H2-rubriker så både läsare och sökmotorer ser strukturen."),
  );

  checks.push(
    $('link[rel="canonical"]').attr("href")
      ? check("canonical", "seo", "Kanonisk URL", 1, "pass", "Canonical-länk finns.", "")
      : check("canonical", "seo", "Kanonisk URL", 1, "warn", "Ingen canonical-länk.", "Lägg till <link rel=\"canonical\"> så sökmotorer vet vilken URL som är originalet."),
  );

  checks.push(
    $('meta[name="viewport"]').length > 0
      ? check("mobile", "seo", "Mobilanpassning", 2, "pass", "Viewport är satt.", "")
      : check("mobile", "seo", "Mobilanpassning", 2, "fail", "Viewport-taggen saknas.", "Lägg till <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> och säkerställ att sidan fungerar i mobilen."),
  );

  const lang = $("html").attr("lang");
  checks.push(
    lang
      ? check("lang", "seo", "Språkangivelse", 1, "pass", `lang="${lang}".`, "")
      : check("lang", "seo", "Språkangivelse", 1, "warn", "html-elementet saknar lang.", "Sätt lang=\"sv\" (eller rätt språk) på <html>."),
  );

  const images = $("img");
  const missingAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;
  if (images.length === 0 || missingAlt === 0) {
    checks.push(check("alt", "seo", "Alt-texter på bilder", 1, "pass", images.length ? `Alla ${images.length} bilder har alt-text.` : "Inga bilder på sidan.", ""));
  } else {
    const share = missingAlt / images.length;
    checks.push(check("alt", "seo", "Alt-texter på bilder", 1, share > 0.5 ? "fail" : "warn", `${missingAlt} av ${images.length} bilder saknar alt-text.`, "Beskriv bilderna med alt-text — det hjälper både tillgänglighet och bildsök."));
  }

  checks.push(
    $('meta[property="og:title"]').length > 0 && $('meta[property="og:image"]').length > 0
      ? check("og", "seo", "Delningsbild (Open Graph)", 1, "pass", "og:title och og:image finns.", "")
      : check("og", "seo", "Delningsbild (Open Graph)", 1, "warn", "Open Graph-taggar saknas eller är ofullständiga.", "Lägg till og:title, og:description och og:image så länkar ser bra ut när de delas."),
  );

  checks.push(
    /noindex/i.test($('meta[name="robots"]').attr("content") ?? "")
      ? check("indexable", "seo", "Indexerbar", 4, "fail", "Sidan har noindex.", "Ta bort noindex från sidor som ska synas — som det ser ut nu kan de inte visas i sökresultat alls.")
      : check("indexable", "seo", "Indexerbar", 4, "pass", "Sidan får indexeras.", ""),
  );

  const speed: CheckStatus = input.ms < 1200 ? "pass" : input.ms < 3000 ? "warn" : "fail";
  checks.push(
    check("speed", "seo", "Svarstid", 2, speed, `HTML-svaret tog ${(input.ms / 1000).toFixed(1)} s.`, speed === "pass" ? "" : "Snabba upp serverns svarstid med cache och CDN — långsamma sidor rankar och konverterar sämre."),
  );

  // GEO

  checks.push(
    words >= 300
      ? check("content", "geo", "Läsbart innehåll", 3, "pass", `Cirka ${words} ord i HTML:en.`, "")
      : check("content", "geo", "Läsbart innehåll", 3, words >= 80 ? "warn" : "fail", `Bara cirka ${words} ord syns utan JavaScript.`, "AI-sökmotorer läser sällan JavaScript. Rendera huvudinnehållet på servern och skriv ut mer konkret text om vad ni erbjuder."),
  );

  const hasOrg = schemaTypes.some((t) => /Organization|LocalBusiness|Corporation|Store|Restaurant|ProfessionalService/i.test(t));
  if (schemaTypes.length === 0) {
    checks.push(check("schema", "geo", "Strukturerad data", 3, "fail", "Ingen JSON-LD.", "Lägg till strukturerad data (schema.org) för organisationen och huvudinnehållet så AI-tjänster förstår vem ni är."));
  } else if (!hasOrg) {
    checks.push(check("schema", "geo", "Strukturerad data", 3, "warn", `Typer: ${schemaTypes.slice(0, 5).join(", ")}. Organisation saknas.`, "Komplettera med Organization- eller LocalBusiness-schema med namn, logotyp, kontaktuppgifter och sameAs-länkar."));
  } else {
    checks.push(check("schema", "geo", "Strukturerad data", 3, "pass", `Typer: ${schemaTypes.slice(0, 5).join(", ")}.`, ""));
  }

  const questions = $("h2, h3").filter((_, el) => $(el).text().trim().endsWith("?")).length;
  const hasFaqSchema = schemaTypes.some((t) => /FAQPage|QAPage/i.test(t));
  checks.push(
    questions >= 2 || hasFaqSchema
      ? check("questions", "geo", "Svar på frågor", 2, "pass", hasFaqSchema ? "FAQ-schema finns." : `${questions} rubriker är formulerade som frågor.`, "")
      : check("questions", "geo", "Svar på frågor", 2, "warn", "Innehållet är inte strukturerat kring frågor.", "Formulera rubriker som de frågor kunder faktiskt ställer och svara direkt under — det är så AI-svar plockar citat."),
  );

  const hasContact =
    /\b(\+46|0\d{1,3})[\s-]?\d{2,3}[\s-]?\d{2}[\s-]?\d{2}\b/.test(text) ||
    $('a[href^="tel:"], a[href^="mailto:"]').length > 0 ||
    schemaTypes.some((t) => /PostalAddress|ContactPoint/i.test(t));
  checks.push(
    hasContact
      ? check("entity", "geo", "Tydlig avsändare", 2, "pass", "Kontaktuppgifter syns.", "")
      : check("entity", "geo", "Tydlig avsändare", 2, "warn", "Inga kontaktuppgifter hittades.", "Visa vem som står bakom sajten — namn, adress, telefon och e-post — så AI-tjänster kan knyta innehållet till en verklig verksamhet."),
  );

  const freshness =
    $('meta[property="article:modified_time"], meta[property="article:published_time"], time[datetime]').length > 0 ||
    /dateModified|datePublished/.test(input.html);
  checks.push(
    freshness
      ? check("freshness", "geo", "Datum och aktualitet", 1, "pass", "Publicerings- eller uppdateringsdatum finns.", "")
      : check("freshness", "geo", "Datum och aktualitet", 1, "warn", "Inget datum.", "Märk upp när innehållet senast uppdaterades — AI-tjänster föredrar färsk och daterad information."),
  );

  checks.push(
    $("ul li, ol li").length >= 5 || $("table").length > 0
      ? check("lists", "geo", "Lätt att citera", 1, "pass", "Listor eller tabeller finns.", "")
      : check("lists", "geo", "Lätt att citera", 1, "warn", "Få listor och inga tabeller.", "Bryt ut fakta, priser och steg i listor och tabeller — korta, fristående stycken citeras oftare."),
  );

  return {
    url: input.url,
    status: input.status,
    title,
    h1: h1s[0] ?? "",
    checks,
    links,
  };
}

// ── Sammanvägning ──────────────────────────────────────────────────────────

const POINTS: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

/** Kontroller där det räcker att en sida klarar det: kontaktuppgifter och
 *  frågor och svar brukar bo på egna sidor, inte på varje sida. */
const ANY_PAGE = new Set(["entity", "questions"]);

const pathOf = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};

/**
 * Väger ihop sidkontrollerna. Andelen godkända sidor blir kontrollens
 * poäng, så en brist på en av tio sidor drar mindre än en brist på alla.
 * Startsidan står först i `pages`, så dess fynd används som exempel i första hand.
 */
export function aggregate(pages: PageResult[]): Check[] {
  if (pages.length === 1) return pages[0].checks;
  const n = pages.length;

  return pages[0].checks.map((first) => {
    const all = pages.map((p) => ({ page: p, c: p.checks.find((c) => c.id === first.id)! }));
    const bad = all.filter((x) => x.c.status !== "pass");

    if (ANY_PAGE.has(first.id)) {
      const best = all.find((x) => x.c.status === "pass") ?? all.find((x) => x.c.status === "warn") ?? all[0];
      const where = best.c.status === "pass" ? ` (${pathOf(best.page.url)})` : ` Gäller alla ${n} granskade sidor.`;
      return { ...best.c, detail: best.c.detail + where, fix: first.fix || bad[0]?.c.fix || "" };
    }

    const ratio = all.reduce((s, x) => s + POINTS[x.c.status], 0) / n;
    const status: CheckStatus = ratio >= 0.85 ? "pass" : ratio >= 0.45 ? "warn" : "fail";
    const detail =
      bad.length === 0
        ? `OK på alla ${n} sidor.`
        : bad.length === n
          ? `Gäller alla ${n} sidor. ${bad[0].c.detail}`
          : `${bad.length} av ${n} sidor. Till exempel ${pathOf(bad[0].page.url)}: ${bad[0].c.detail}`;
    return { ...first, status, ratio, detail, fix: bad[0]?.c.fix ?? "" };
  });
}

// ── Sajtkontroller ─────────────────────────────────────────────────────────

export function siteChecks(input: {
  url: string;
  robotsTxt: string | null;
  hasSitemap: boolean;
  hasLlmsTxt: boolean;
  pages: PageResult[];
  broken: { url: string; status: number }[];
  /** Antal undersidor vi försökte hämta. Noll betyder att inga hittades. */
  attempted: number;
}): Check[] {
  const checks: Check[] = [];
  const url = new URL(input.url);
  const blocked = input.robotsTxt ? blockedAgents(input.robotsTxt) : new Set<string>();

  checks.push(
    url.protocol === "https:"
      ? check("https", "seo", "HTTPS", 2, "pass", "Sajten levereras över HTTPS.", "")
      : check("https", "seo", "HTTPS", 2, "fail", "Sajten levereras utan kryptering.", "Flytta sajten till HTTPS och omdirigera all http-trafik dit."),
  );

  checks.push(
    blocked.has("*")
      ? check("crawlable", "seo", "Sökrobotar släpps in", 4, "fail", "robots.txt spärrar alla sökrobotar.", "Ta bort spärren i robots.txt — som det ser ut nu kan sajten inte visas i sökresultat alls.")
      : check("crawlable", "seo", "Sökrobotar släpps in", 4, "pass", "robots.txt spärrar inte sajten.", ""),
  );

  checks.push(
    input.hasSitemap
      ? check("sitemap", "seo", "Sitemap", 1, "pass", "Sitemap hittades.", "")
      : check("sitemap", "seo", "Sitemap", 1, "warn", "Ingen sitemap hittades.", "Publicera en sitemap.xml och länka den från robots.txt."),
  );

  if (input.attempted > 0) {
    checks.push(
      input.broken.length === 0
        ? check("broken", "seo", "Trasiga länkar", 2, "pass", "Inga trasiga interna länkar bland de granskade sidorna.", "")
        : check(
            "broken",
            "seo",
            "Trasiga länkar",
            2,
            "fail",
            `${input.broken.length} interna länkar leder till fel: ${input.broken.slice(0, 3).map((b) => `${pathOf(b.url)} (${b.status})`).join(", ")}.`,
            "Laga eller ta bort länkar till sidor som inte finns — de slösar sökrobotarnas tid och ger besökare en återvändsgränd.",
          ),
    );
  }

  const titled = input.pages.filter((p) => p.title);
  if (titled.length >= 3) {
    const counts = new Map<string, number>();
    titled.forEach((p) => counts.set(p.title, (counts.get(p.title) ?? 0) + 1));
    const dupes = [...counts].filter(([, c]) => c > 1);
    checks.push(
      dupes.length === 0
        ? check("unique", "seo", "Unika titlar", 2, "pass", `Alla ${titled.length} sidor har egna titlar.`, "")
        : check(
            "unique",
            "seo",
            "Unika titlar",
            2,
            dupes.some(([, c]) => c >= titled.length / 2) ? "fail" : "warn",
            `${dupes.reduce((s, [, c]) => s + c, 0)} sidor delar titel, till exempel "${dupes[0][0]}".`,
            "Ge varje sida en egen titel som beskriver just den sidan — annars vet sökmotorer inte vilken sida som ska visas för vad.",
          ),
    );
  }

  if (input.robotsTxt) {
    const named = new Set(robotsGroups(input.robotsTxt).flatMap((g) => g.agents));
    // En bot utan egen grupp följer *-gruppen.
    const blockedBots = AI_BOTS.filter((b) => blocked.has(b.toLowerCase()) || (!named.has(b.toLowerCase()) && blocked.has("*")));
    checks.push(
      blockedBots.length === 0
        ? check("aibots", "geo", "AI-robotar släpps in", 3, "pass", "robots.txt spärrar inga kända AI-robotar.", "")
        : check("aibots", "geo", "AI-robotar släpps in", 3, "fail", `Spärrade: ${blockedBots.join(", ")}.`, "Släpp in AI-robotarna i robots.txt om ni vill synas i ChatGPT, Claude, Perplexity och Googles AI-svar."),
    );
  } else {
    checks.push(check("aibots", "geo", "AI-robotar släpps in", 3, "pass", "Ingen robots.txt, inga spärrar.", ""));
  }

  checks.push(
    input.hasLlmsTxt
      ? check("llms", "geo", "llms.txt", 1, "pass", "/llms.txt finns.", "")
      : check("llms", "geo", "llms.txt", 1, "warn", "/llms.txt saknas.", "Publicera en /llms.txt med en kort sammanfattning av verksamheten och länkar till de viktigaste sidorna."),
  );

  return checks;
}

function toTen(ratio: number) {
  return Math.min(10, Math.max(1, Math.round(ratio * 10)));
}

export function score(checks: Check[]) {
  const ratio = (group: CheckGroup) => {
    const list = checks.filter((c) => c.group === group);
    const total = list.reduce((s, c) => s + c.weight, 0);
    return total ? list.reduce((s, c) => s + c.weight * (c.ratio ?? POINTS[c.status]), 0) / total : 0;
  };
  const seo = ratio("seo");
  const geo = ratio("geo");
  return { score: toTen((seo + geo) / 2), seoScore: toTen(seo), geoScore: toTen(geo) };
}
