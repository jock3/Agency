import * as cheerio from "cheerio";
import type { Check, CheckGroup, CheckStatus } from "./types";

/**
 * Fasta kontroller. Betyget kommer härifrån och inte från Claude, så samma sajt
 * får samma betyg varje gång. Åtgärdstexterna är fasta; Claude skriver bara
 * extra text ovanpå i ai.ts.
 *
 * Kontrollerna finns i två sorter. Sidkontroller (titel, rubriker, schema …)
 * körs på varje granskad sida och vägs sedan ihop i `aggregate`. Sajtkontroller
 * (HTTPS, robots.txt, sitemap …) gäller hela domänen och körs en gång.
 *
 * Gränserna är medvetet stränga: grön bock betyder att kontrollen är helt
 * uppfylld, inte "tillräckligt bra". Allt däremellan blir gult.
 *
 * Vikterna säger hur mycket en kontroll betyder inom sin grupp. SEO och GEO
 * vägs sedan lika i totalbetyget.
 */

const ORG_TYPES = /Organization|LocalBusiness|Corporation|Store|Restaurant|ProfessionalService/i;

const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"];

/** Böjer ord efter antal: plural(1, "bild", "bilder") ger "bild". */
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** Svenskt decimaltecken: 2,5 i stället för 2.5. */
const sv = (n: number) => n.toFixed(1).replace(".", ",");

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
  description: string;
  h1: string;
  /** Sidan länkar till sociala profiler via schema.org sameAs. */
  hasSameAs: boolean;
  checks: Check[];
  schemaTypes: string[];
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
    checks.push(check("title", "seo", "Sidtitel", 3, "fail", "Titel saknas. Titeln är den klickbara rubriken i Google och texten i webbläsarfliken. Utan den ser sidan namnlös ut.", "Ge varje sida en unik titel på 30–60 tecken som börjar med det viktigaste sökordet."));
  } else if (title.length < 30 || title.length > 60) {
    checks.push(check("title", "seo", "Sidtitel", 3, "warn", `Titeln är ${title.length} tecken, och den bör vara 30–60. Är den längre kapar Google av den. Är den kortare säger den för lite om sidan. Nu: "${title}".`, "Skriv om titlarna till 30–60 tecken så de inte kapas i sökresultatet och ändå säger vad sidan handlar om."));
  } else {
    checks.push(check("title", "seo", "Sidtitel", 3, "pass", `Titeln har lagom längd: "${title}" (${title.length} tecken).`, ""));
  }

  if (!description) {
    checks.push(check("description", "seo", "Beskrivning i Google", 2, "fail", "Beskrivning saknas. Det är den lilla texten under rubriken i Google. Saknas den väljer Google själv en bit text från sidan, och den blir sällan särskilt bra.", "Skriv en metabeskrivning på 120–160 tecken för varje viktig sida, som säljer in klicket från sökresultatet."));
  } else if (description.length < 120 || description.length > 160) {
    checks.push(check("description", "seo", "Beskrivning i Google", 2, "warn", `Beskrivningen är ${description.length} tecken, och den bör vara 120–160. Är den för lång klipps den av i Google. Är den för kort blir den inte särskilt övertygande.`, "Justera metabeskrivningarna till 120–160 tecken."));
  } else {
    checks.push(check("description", "seo", "Beskrivning i Google", 2, "pass", `Beskrivningen har lagom längd (${description.length} tecken).`, ""));
  }

  if (h1s.length === 1) {
    checks.push(check("h1", "seo", "Huvudrubrik", 2, "pass", `Sidan har en huvudrubrik: "${h1s[0].slice(0, 80)}"`, ""));
  } else if (h1s.length === 0) {
    const detail = h1Count ? "Huvudrubriken är tom. Platsen för den finns, men ingen text står där, till exempel bara en logotyp." : "Huvudrubrik saknas. Varje sida bör ha en stor rubrik som tydligt säger vad sidan handlar om, för både besökare och Google.";
    checks.push(check("h1", "seo", "Huvudrubrik", 2, "fail", detail, "Ge varje sida exakt en H1 som tydligt säger vad sidan erbjuder."));
  } else {
    checks.push(check("h1", "seo", "Huvudrubrik", 2, "warn", `Det finns ${h1s.length} huvudrubriker, och det ska bara vara en. Med flera blir det oklart för Google vad sidan egentligen handlar om.`, "Behåll en H1 per sida och gör övriga till H2."));
  }

  checks.push(
    h2Count >= 2
      ? check("structure", "seo", "Rubrikstruktur", 1, "pass", `Texten är uppdelad med ${h2Count} underrubriker, vilket gör den lätt att skumma.`, "")
      : check("structure", "seo", "Rubrikstruktur", 1, "warn", `${h2Count === 0 ? "Texten har inga underrubriker" : "Texten har bara en underrubrik"}. Delas texten upp med fler rubriker blir den lättare att skumma, för både besökare och Google.`, "Dela upp innehållet med beskrivande H2-rubriker så både läsare och sökmotorer ser strukturen."),
  );

  const canonical = $('link[rel="canonical"]').attr("href")?.trim();
  let canonicalHost: string | null = null;
  try {
    if (canonical) canonicalHost = new URL(canonical, input.url).hostname.replace(/^www\./, "");
  } catch {
    // Ogiltig canonical behandlas som saknad.
  }
  if (!canonical || !canonicalHost) {
    checks.push(check("canonical", "seo", "Rätt adress till sidan", 1, "warn", "Sidan säger inte vilken adress som är den riktiga. Finns samma sida på flera adresser, till exempel med och utan www, kan Google bli osäker på vilken som ska visas.", "Lägg till <link rel=\"canonical\"> så sökmotorer vet vilken URL som är originalet."));
  } else if (canonicalHost !== new URL(input.url).hostname.replace(/^www\./, "")) {
    checks.push(check("canonical", "seo", "Rätt adress till sidan", 1, "fail", `Sidan pekar ut en annan sajt (${canonicalHost}) som originalet. Då kan Google välja att visa den sajten i stället för den här.`, "Låt canonical peka på sidans egen URL — som det ser ut nu försöker sidan lämna över sin synlighet till en annan sajt."));
  } else {
    checks.push(check("canonical", "seo", "Rätt adress till sidan", 1, "pass", "Sidan pekar ut sin egen adress som den riktiga.", ""));
  }

  checks.push(
    $('meta[name="viewport"]').length > 0
      ? check("mobile", "seo", "Mobilanpassning", 2, "pass", "Sidan anpassar sig till mobilskärmar.", "")
      : check("mobile", "seo", "Mobilanpassning", 2, "fail", "Sidan är inte anpassad för mobilen. På en telefon visas den som en förminskad datorsida, och Google rankar sådana sidor lägre.", "Lägg till <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> och säkerställ att sidan fungerar i mobilen."),
  );

  const lang = $("html").attr("lang");
  checks.push(
    lang
      ? check("lang", "seo", "Språk angivet", 1, "pass", `Språket är angivet (${lang}).`, "")
      : check("lang", "seo", "Språk angivet", 1, "warn", "Sidan säger inte vilket språk den är skriven på. Google och uppläsningsprogram får gissa, och kan gissa fel.", "Sätt lang=\"sv\" (eller rätt språk) på <html>."),
  );

  const images = $("img");
  const missingAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;
  if (images.length === 0 || missingAlt === 0) {
    checks.push(check("alt", "seo", "Bildbeskrivningar", 1, "pass", images.length ? images.length === 1 ? "Bilden har en beskrivning." : `Alla ${images.length} bilder har en beskrivning.` : "Inga bilder på sidan.", ""));
  } else {
    const share = missingAlt / images.length;
    checks.push(check("alt", "seo", "Bildbeskrivningar", 1, share > 0.5 ? "fail" : "warn", `${images.length === 1 ? "Bilden saknar beskrivning" : `${missingAlt} av ${images.length} bilder saknar beskrivning`}. Beskrivningen läses upp för personer som inte ser bilden och hjälper Google förstå vad bilden visar.`, "Beskriv bilderna med alt-text — det hjälper både tillgänglighet och bildsök."));
  }

  const unsized = images.filter((_, el) => !($(el).attr("width") && $(el).attr("height"))).length;
  checks.push(
    images.length === 0 || unsized === 0
      ? check("imgsize", "seo", "Bildstorlekar", 1, "pass", images.length ? images.length === 1 ? "Bilden har angiven storlek." : "Alla bilder har angiven storlek." : "Inga bilder på sidan.", "")
      : check("imgsize", "seo", "Bildstorlekar", 1, unsized / images.length > 0.5 ? "fail" : "warn", `${images.length === 1 ? "Bilden har ingen angiven storlek" : `${unsized} av ${images.length} bilder har ingen angiven storlek`}. Då hoppar innehållet omkring medan sidan laddas, vilket är irriterande och ger sidan sämre betyg av Google.`, "Ange width och height på bilderna så sidan inte hoppar när de laddas — det är en del av Googles Core Web Vitals (CLS)."),
  );

  const host = new URL(input.url).hostname.replace(/^www\./, "");
  const internalLinks = links.filter((l) => new URL(l).hostname.replace(/^www\./, "") === host).length;
  checks.push(
    internalLinks >= 5
      ? check("internal", "seo", "Länkar mellan sidor", 1, "pass", `Sidan länkar vidare till andra sidor på sajten (${internalLinks} länkar).`, "")
      : check("internal", "seo", "Länkar mellan sidor", 1, internalLinks >= 2 ? "warn" : "fail", `${internalLinks === 0 ? "Det finns inga länkar" : "Det finns bara en länk"} till andra sidor på sajten. Fler länkar gör det lättare för besökare och Google att hitta resten av sajten.`, "Länka till relaterade sidor i texten och i menyn — interna länkar hjälper sökrobotar hitta sidor och fördelar styrka mellan dem."),
  );

  checks.push(
    ["og:title", "og:description", "og:image"].every((p) => $(`meta[property="${p}"]`).attr("content")?.trim())
      ? check("og", "seo", "Utseende när länken delas", 1, "pass", "Länken visas med titel, text och bild när den delas.", "")
      : check("og", "seo", "Utseende när länken delas", 1, "warn", "När någon delar länken på till exempel LinkedIn eller Facebook saknas rubrik, text eller bild i förhandsvisningen. Det ser tomt ut och färre klickar.", "Lägg till og:title, og:description och og:image så länkar ser bra ut när de delas."),
  );

  checks.push(
    /noindex/i.test($('meta[name="robots"]').attr("content") ?? "")
      ? check("indexable", "seo", "Får visas i Google", 4, "fail", "Sidan är markerad så att Google inte får visa den i sökresultaten (noindex). Är det inte meningen att den ska vara dold måste markeringen tas bort.", "Ta bort noindex från sidor som ska synas — som det ser ut nu kan de inte visas i sökresultat alls.")
      : check("indexable", "seo", "Får visas i Google", 4, "pass", "Google får visa sidan i sökresultaten.", ""),
  );

  const speed: CheckStatus = input.ms < 800 ? "pass" : input.ms < 2000 ? "warn" : "fail";
  checks.push(
    check("speed", "seo", "Laddningstid", 2, speed, speed === "pass" ? `Sidan svarar snabbt (${sv(input.ms / 1000)} sekunder).` : `Sidan behöver ${sv(input.ms / 1000)} sekunder för att svara. Det är långsamt, och både Google och besökare tappar tålamodet.`, speed === "pass" ? "" : "Snabba upp serverns svarstid med cache och CDN — långsamma sidor rankar och konverterar sämre."),
  );

  // GEO

  checks.push(
    words >= 400
      ? check("content", "geo", "Läsbart innehåll", 3, "pass", `Det finns gott om text som AI-tjänster kan läsa (cirka ${words} ord).`, "")
      : check("content", "geo", "Läsbart innehåll", 3, words >= 150 ? "warn" : "fail", `Bara cirka ${words} ord går att läsa för AI-tjänster. De ser ofta bara texten som finns direkt i sidans kod, inte sådant som laddas in efteråt. Det mesta av innehållet kan därför vara osynligt för dem.`, "AI-sökmotorer läser sällan JavaScript. Rendera huvudinnehållet på servern och skriv ut mer konkret text om vad ni erbjuder."),
  );

  // Organisationen behöver bara beskrivas på en sida och kontrolleras därför
  // för hela sajten i siteChecks. Här räcker det att sidan har någon JSON-LD.
  checks.push(
    schemaTypes.length > 0
      ? check("schema", "geo", "Information för AI och Google", 2, "pass", `Sidan innehåller information som AI och Google kan läsa direkt (${schemaTypes.slice(0, 5).join(", ")}).`, "")
      : check("schema", "geo", "Information för AI och Google", 2, "fail", "Information som är skriven för maskiner saknas. Den berättar för Google och AI-tjänster vad sidan är, till exempel en tjänst, en artikel eller en produkt.", "Lägg till strukturerad data (schema.org) på varje sida — till exempel WebPage, Article, Service eller Product — så AI-tjänster förstår vad sidan handlar om."),
  );

  const questions = $("h2, h3").filter((_, el) => $(el).text().trim().endsWith("?")).length;
  const hasFaqSchema = schemaTypes.some((t) => /FAQPage|QAPage/i.test(t));
  checks.push(
    questions >= 2 || hasFaqSchema
      ? check("questions", "geo", "Svar på frågor", 2, "pass", hasFaqSchema ? "Sidan har vanliga frågor med svar som AI-tjänster kan använda." : `${questions} rubriker är formulerade som frågor, vilket AI-tjänster gärna citerar.`, "")
      : check("questions", "geo", "Svar på frågor", 2, "warn", "Sidan svarar inte på frågor på det sätt AI-tjänster letar efter. Rubriker formulerade som frågor, med svaret direkt under, är det som oftast citeras.", "Formulera rubriker som de frågor kunder faktiskt ställer och svara direkt under — det är så AI-svar plockar citat."),
  );

  const hasContact =
    /\b(\+46|0\d{1,3})[\s-]?\d{2,3}[\s-]?\d{2}[\s-]?\d{2}\b/.test(text) ||
    $('a[href^="tel:"], a[href^="mailto:"]').length > 0 ||
    schemaTypes.some((t) => /PostalAddress|ContactPoint/i.test(t));
  checks.push(
    hasContact
      ? check("entity", "geo", "Tydlig avsändare", 2, "pass", "Kontaktuppgifter syns, så det är tydligt vem som står bakom sajten.", "")
      : check("entity", "geo", "Tydlig avsändare", 2, "warn", "Det syns inte vem som står bakom sajten. Inga kontaktuppgifter som adress, telefon eller e-post hittades. AI-tjänster litar mindre på sajter utan tydlig avsändare.", "Visa vem som står bakom sajten — namn, adress, telefon och e-post — så AI-tjänster kan knyta innehållet till en verklig verksamhet."),
  );

  const freshness =
    $('meta[property="article:modified_time"], meta[property="article:published_time"], time[datetime]').length > 0 ||
    /dateModified|datePublished/.test(input.html);
  checks.push(
    freshness
      ? check("freshness", "geo", "Datum och aktualitet", 1, "pass", "Sidan visar när innehållet publicerades eller uppdaterades.", "")
      : check("freshness", "geo", "Datum och aktualitet", 1, "warn", "Sidan visar inget datum, så det går inte att se hur färskt innehållet är. AI-tjänster föredrar innehåll med tydligt datum.", "Märk upp när innehållet senast uppdaterades — AI-tjänster föredrar färsk och daterad information."),
  );

  const hasAuthor =
    $('meta[name="author"], [rel="author"], [itemprop="author"], [class*="author"], [class*="byline"]').length > 0 ||
    schemaTypes.some((t) => /^Person$/i.test(t)) ||
    /"author"\s*:/.test(input.html);
  checks.push(
    hasAuthor
      ? check("author", "geo", "Namngiven avsändare", 1, "pass", "Det framgår vem som står bakom innehållet.", "")
      : check("author", "geo", "Namngiven avsändare", 1, "warn", "Det framgår inte vem som skrivit texterna. Namngivna personer gör innehållet mer trovärdigt för både läsare och AI-tjänster.", "Visa vem som skrivit eller står bakom innehållet, gärna med Person-schema — AI-tjänster väger expertis och trovärdighet (E-E-A-T)."),
  );

  checks.push(
    $("ul li, ol li").length >= 5 || $("table").length > 0
      ? check("lists", "geo", "Lätt att citera", 1, "pass", "Fakta finns i listor eller tabeller, som är lätta att citera.", "")
      : check("lists", "geo", "Lätt att citera", 1, "warn", "Informationen står mest i långa stycken. Listor och tabeller är lättare för AI-tjänster att plocka ut och citera.", "Bryt ut fakta, priser och steg i listor och tabeller — korta, fristående stycken citeras oftare."),
  );

  return {
    url: input.url,
    status: input.status,
    title,
    description,
    h1: h1s[0] ?? "",
    hasSameAs: /"sameAs"\s*:/.test(input.html),
    checks,
    schemaTypes,
    links,
  };
}

// ── Sammanvägning ──────────────────────────────────────────────────────────

const POINTS: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

/** Kontroller där det räcker att en sida klarar det: kontaktuppgifter och
 *  frågor och svar brukar bo på egna sidor, inte på varje sida. */
const ANY_PAGE = new Set(["entity", "questions", "author"]);

const pathOf = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};

/**
 * Väger ihop sidkontrollerna. Grönt kräver att alla sidor klarar kontrollen;
 * klarar minst hälften blir det gult, annars rött.
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
      return { ...best.c, fix: first.fix || bad[0]?.c.fix || "" };
    }

    const ratio = all.reduce((s, x) => s + POINTS[x.c.status], 0) / n;
    // Grönt kräver att varje granskad sida klarar kontrollen.
    const status: CheckStatus = bad.length === 0 ? "pass" : ratio >= 0.5 ? "warn" : "fail";
    // Förklaringen är den från första sidan som brister, utan antal eller omfattning.
    const detail = bad.length === 0 ? first.detail : bad[0].c.detail;
    return { ...first, status, detail, fix: bad[0]?.c.fix ?? "" };
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
      ? check("https", "seo", "HTTPS", 2, "pass", "Sajten är säker (https).", "")
      : check("https", "seo", "HTTPS", 2, "fail", "Sajten är inte krypterad (http). Webbläsare visar en varning för besökarna, och Google rankar sajten lägre.", "Flytta sajten till HTTPS och omdirigera all http-trafik dit."),
  );

  checks.push(
    blocked.has("*")
      ? check("crawlable", "seo", "Sökrobotar släpps in", 4, "fail", "Sajten säger åt alla sökrobotar att hålla sig borta (i filen robots.txt). Då kan Google inte läsa sajten, och den syns inte i sökresultaten alls.", "Ta bort spärren i robots.txt — som det ser ut nu kan sajten inte visas i sökresultat alls.")
      : check("crawlable", "seo", "Sökrobotar släpps in", 4, "pass", "Google och andra sökrobotar får läsa sajten.", ""),
  );

  checks.push(
    input.hasSitemap
      ? check("sitemap", "seo", "Sajtkarta", 1, "pass", "Sajten har en sajtkarta som hjälper Google hitta alla sidor.", "")
      : check("sitemap", "seo", "Sajtkarta", 1, "warn", "Sajtkarta (sitemap) saknas. Det är en lista över alla sidor som hjälper Google att hitta allt på sajten.", "Publicera en sitemap.xml och länka den från robots.txt."),
  );

  if (input.attempted > 0) {
    checks.push(
      input.broken.length === 0
        ? check("broken", "seo", "Trasiga länkar", 2, "pass", "Inga länkar mellan sidorna leder till fel.", "")
        : check(
            "broken",
            "seo",
            "Trasiga länkar",
            2,
            "fail",
            `${input.broken.length} ${plural(input.broken.length, "länk leder till en sida som inte finns eller ger fel", "länkar leder till sidor som inte finns eller ger fel")}: ${input.broken.slice(0, 3).map((b) => `${pathOf(b.url)} (${b.status})`).join(", ")}. Besökaren hamnar i en återvändsgränd.`,
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
        ? check("unique", "seo", "Egna titlar", 2, "pass", "Varje sida har en egen titel.", "")
        : check(
            "unique",
            "seo",
            "Egna titlar",
            2,
            dupes.some(([, c]) => c >= titled.length / 2) ? "fail" : "warn",
            `Flera sidor har exakt samma titel, till exempel "${dupes[0][0]}". Då kan Google inte skilja sidorna åt.`,
            "Ge varje sida en egen titel som beskriver just den sidan — annars vet sökmotorer inte vilken sida som ska visas för vad.",
          ),
    );
  }

  const described = input.pages.filter((p) => p.description);
  if (described.length >= 3) {
    const counts = new Map<string, number>();
    described.forEach((p) => counts.set(p.description, (counts.get(p.description) ?? 0) + 1));
    const dupes = [...counts].filter(([, c]) => c > 1);
    checks.push(
      dupes.length === 0
        ? check("uniquedesc", "seo", "Egna beskrivningar i Google", 1, "pass", "Varje sida har en egen beskrivning.", "")
        : check(
            "uniquedesc",
            "seo",
            "Egna beskrivningar i Google",
            1,
            dupes.some(([, c]) => c >= described.length / 2) ? "fail" : "warn",
            "Flera sidor har exakt samma beskrivning i Google. Sökresultaten ser då likadana ut, och färre klickar.",
            "Skriv en egen metabeskrivning per sida — samma text överallt ger sökresultat som ser likadana ut och lägre klickfrekvens.",
          ),
    );
  }

  if (input.robotsTxt) {
    const named = new Set(robotsGroups(input.robotsTxt).flatMap((g) => g.agents));
    // En bot utan egen grupp följer *-gruppen.
    const blockedBots = AI_BOTS.filter((b) => blocked.has(b.toLowerCase()) || (!named.has(b.toLowerCase()) && blocked.has("*")));
    checks.push(
      blockedBots.length === 0
        ? check("aibots", "geo", "AI-robotar släpps in", 3, "pass", "AI-tjänster som ChatGPT och Claude får läsa sajten.", "")
        : check("aibots", "geo", "AI-robotar släpps in", 3, "fail", `Sajten stoppar ${plural(blockedBots.length, "den här AI-tjänsten", "dessa AI-tjänster")} från att läsa den: ${blockedBots.join(", ")}. Då kan ${plural(blockedBots.length, "den", "de")} inte använda sajten när ${plural(blockedBots.length, "den", "de")} svarar på frågor.`, "Släpp in AI-robotarna i robots.txt om ni vill synas i ChatGPT, Claude, Perplexity och Googles AI-svar."),
    );
  } else {
    checks.push(check("aibots", "geo", "AI-robotar släpps in", 3, "pass", "Inget stoppar AI-tjänsterna från att läsa sajten.", ""));
  }

  const org = input.pages.find((p) => p.schemaTypes.some((t) => ORG_TYPES.test(t)));
  checks.push(
    org
      ? check("org", "geo", "Företaget beskrivet för AI", 2, "pass", "Företaget är beskrivet på ett sätt som AI-tjänster förstår.", "")
      : check("org", "geo", "Företaget beskrivet för AI", 2, "fail", "Företaget är inte beskrivet på ett sätt som AI-tjänster förstår, med namn, logotyp och adress. De får gissa vem som står bakom sajten.", "Beskriv företaget med Organization- eller LocalBusiness-schema: namn, logotyp, adress, kontaktuppgifter och sameAs-länkar till sociala profiler."),
  );

  checks.push(
    input.pages.some((p) => p.hasSameAs)
      ? check("sameas", "geo", "Sociala profiler", 1, "pass", "Företagets sociala profiler är kopplade till sajten.", "")
      : check("sameas", "geo", "Sociala profiler", 1, "warn", "Sajten är inte kopplad till företagets sociala profiler, till exempel LinkedIn och Facebook. Kopplingen hjälper AI-tjänster att känna igen er som samma företag överallt.", "Lägg till sameAs i Organization-schemat med länkar till LinkedIn, Facebook, Instagram och andra profiler, så AI-tjänster kan koppla ihop varumärket."),
  );

  checks.push(
    input.hasLlmsTxt
      ? check("llms", "geo", "Sammanfattning för AI", 1, "pass", "Sajten har en sammanfattning särskilt för AI-tjänster.", "")
      : check("llms", "geo", "Sammanfattning för AI", 1, "warn", "Sammanfattning för AI-tjänster saknas (filen llms.txt). Den berättar kort vad ni gör och var det viktigaste på sajten finns.", "Publicera en /llms.txt med en kort sammanfattning av verksamheten och länkar till de viktigaste sidorna."),
  );

  return checks;
}

/** Poängen följer färgen besökaren ser: gult är nästan lika illa som rött.
 *  Andelen godkända sidor styr bara färgen, inte poängen. */
const SCORE_POINTS: Record<CheckStatus, number> = { pass: 1, warn: 0.25, fail: 0 };

/** Kurvan gör att betyget faller snabbare när saker saknas. 10 ges bara när
 *  varje kontroll i gruppen är grön. */
function toTen(ratio: number, perfect: boolean) {
  if (perfect) return 10;
  return Math.min(9, Math.max(1, Math.round(ratio ** 1.5 * 10)));
}

export function score(checks: Check[]) {
  const ratio = (list: Check[]) => {
    const total = list.reduce((s, c) => s + c.weight, 0);
    return total ? list.reduce((s, c) => s + c.weight * SCORE_POINTS[c.status], 0) / total : 0;
  };
  const allPass = (list: Check[]) => list.every((c) => c.status === "pass");
  const seo = checks.filter((c) => c.group === "seo");
  const geo = checks.filter((c) => c.group === "geo");
  return {
    score: toTen((ratio(seo) + ratio(geo)) / 2, allPass(checks)),
    seoScore: toTen(ratio(seo), allPass(seo)),
    geoScore: toTen(ratio(geo), allPass(geo)),
  };
}
