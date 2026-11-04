import * as cheerio from "cheerio";
import { ask, GUARD } from "@/lib/audit/ai";
import type { PageSuggestions, SuggestionItem } from "@/lib/audit/suggest-kinds";
import { fixForeground } from "./contrast";
import type { Finding } from "./score";
import { criterionLabel } from "./wcag";

/**
 * AI-lagret för tillgänglighetsgranskningen. Betyget kommer från axe-core och
 * score.ts; Claude skriver bara text ovanpå fynden och påverkar aldrig
 * betyget. Färgkoder och kontrastvärden räknas i kod, inte av modellen.
 * Reglerna står i docs/ai-rules.md.
 */

/** Höjs när instruktionerna ändras, så att sparade sammanfattningar skrivs om. */
const PROMPT_VERSION = 1;

const SYSTEM_BASE =
  "Du är en senior tillgänglighetsexpert på en svensk reklambyrå. Skriv på svenska, konkret och utan fluff. Betyget är redan satt av automatiska kontroller; du ändrar eller kommenterar det inte. Automatiska tester hittar bara en del av alla WCAG-brister, så påstå aldrig att en sajt är godkänd, underkänd eller följer lagen. Hitta aldrig på uppgifter.";

const nf = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 });

const PRIORITY_LABEL = { critical: "kritiskt", high: "hög", medium: "medel", nice: "nice to have" } as const;

/** Fingeravtryck av fynden. Oförändrat läge återanvänder förra sammanfattningen. */
const keyOf = (findings: Finding[]) => `v${PROMPT_VERSION}\n` + findings.map((f) => `${f.id}|${f.priority}|${f.count}|${f.pages.length}`).join("\n");

/** Kort sammanfattning av en granskning, riktad till en byråmedarbetare. */
export async function summarizeA11y(input: {
  domain: string;
  score: number;
  pageCount: number;
  findings: Finding[];
  /** Förra körningens fynd och sammanfattning. */
  previous?: { findings: Finding[]; summary: string | null } | null;
}): Promise<string | null> {
  if (input.findings.length === 0) return null;
  if (input.previous?.summary && keyOf(input.previous.findings) === keyOf(input.findings)) return input.previous.summary;

  const list = input.findings
    .slice(0, 20)
    .map((f) => {
      const wcag = f.criteria.length ? `WCAG ${f.criteria.map(criterionLabel).join(", ")}` : `nivå ${f.level}`;
      return `- [${PRIORITY_LABEL[f.priority]}] ${f.title} (${wcag}): ${f.count} element på ${f.pages.length} av ${input.pageCount} sidor`;
    })
    .join("\n");
  const prev = input.previous?.findings.length
    ? `\nFörra granskningen hade ${input.previous.findings.length} regler som bröts. Nämn kort vad som har försvunnit eller tillkommit om det syns i listan.`
    : "";

  return ask({
    label: "a11y-summary",
    effort: "low",
    system: SYSTEM_BASE,
    user: `Domän: ${input.domain}\nBetyg ${input.score}/10 efter ${input.pageCount} granskade sidor.\n\nFynd:\n${list}\n${prev}\nSkriv en sammanfattning på högst 120 ord: först ett par meningar om läget, sedan de tre viktigaste sakerna att göra i prioritetsordning (numrerad lista, en rad var, med vilka användare felet drabbar). Siffror får du bara hämta ur listan. Ingen rubrik.`,
    maxTokens: 3000,
    // Granskningen har redan använt det mesta av sin tid.
    timeout: 15_000,
  });
}

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          example: { type: "integer" },
          target: { type: "string" },
          value: { type: "string" },
          kind: { type: "string", enum: ["text", "code"] },
          note: { type: "string" },
        },
        required: ["example", "target", "value", "kind", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const DEFAULT_TASK =
  "För varje exempel: skriv den rättade HTML-koden (kind: code, value: hela elementet rättat) och förklara i note kort vad som ändrats. Kan felet inte rättas utan uppgifter du saknar, skriv [fyll i] på platsen.";

/** Vad som ska skrivas per regel. Regler utan egen rad får DEFAULT_TASK. */
const TASKS: Record<string, string> = {
  "image-alt":
    "Skriv en alt-text per exempel, högst 125 tecken, som beskriver vad bilden visar och passar sammanhanget. Titta på bilden om den bifogas. Ingen inledning som 'Bild på'. target: bildens adress eller väljare, value: alt-texten, kind: text. Är bilden bara dekor, skriv value: \"\" och förklara i note.",
  "role-img-alt": "Skriv en alt-text (aria-label) per exempel, högst 125 tecken, utifrån elementets innehåll. value: texten, kind: text.",
  "svg-img-alt": "Skriv en kort beskrivande text per exempel, högst 125 tecken, att använda som aria-label. Är grafiken dekor: value \"\" och förklara i note. kind: text.",
  "link-name":
    "Föreslå en länktext per exempel som säger vart länken leder eller vad den gör. Har länken bara en bild, föreslå aria-label. Går syftet inte att utläsa ur utdraget, skriv [fyll i]. value: texten, kind: text. note: om den ska stå som synlig text eller som aria-label.",
  "button-name": "Föreslå ett namn per exempel som säger vad knappen gör. Går det inte att utläsa ur utdraget, skriv [fyll i]. value: namnet, kind: text. note: synlig text eller aria-label.",
  label: "Föreslå en etikett per formulärfält, utifrån fältets name, placeholder och omgivning. Går det inte att utläsa, skriv [fyll i]. value: etiketten, kind: text.",
  "select-name": "Föreslå en etikett per listruta, utifrån dess alternativ. Går det inte att utläsa, skriv [fyll i]. value: etiketten, kind: text.",
  "document-title": "Skriv 2 förslag på sidtitel som beskriver sidans innehåll, 30–60 tecken. Använd bara uppgifter från utdraget. kind: text.",
  "html-has-lang": "Skriv det lang-attribut som sidans språk kräver (till exempel sv) och elementet <html lang=\"…\"> färdigt. Är språket oklart, skriv [fyll i]. kind: code.",
  "html-lang-valid": "Skriv ett giltigt lang-attribut (BCP 47, till exempel sv eller en-GB) för <html>, utifrån det felaktiga värdet i utdraget. kind: code.",
  "heading-order": "Förklara kort vilken rubriknivå som ska användas i stället så att nivåerna följer varandra utan hopp, och skriv den rättade taggen. kind: code.",
  "empty-heading": "Föreslå om rubriken ska få text (skriv [fyll i] om texten inte går att utläsa) eller tas bort och ersättas med en vanlig div. kind: text.",
  "color-contrast":
    "Föreslå inga färgkoder och inga kontrastvärden. Beskriv i en mening vad som ska göras: göra texten mörkare eller bakgrunden ljusare tills kontrasten når kravet i felbeskrivningen. kind: text.",
};

/** Bilder som modellen kan titta på. Anthropic hämtar dem själv, inte vi. */
const IMAGE_OK = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const VISION_RULES = new Set(["image-alt"]);

function imageOf(html: string, pageUrl: string): string | null {
  const src = cheerio.load(html)("img").first().attr("src");
  if (!src || src.startsWith("data:")) return null;
  try {
    const u = new URL(src, pageUrl);
    return (u.protocol === "https:" || u.protocol === "http:") && IMAGE_OK.test(u.pathname + u.search) ? u.toString() : null;
  } catch {
    return null;
  }
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Förslag för en regel som bryts: färdig alt-text, etikett, kod. Hämtas i
 * stunden och sparas inte. Kontrastfel får en färg som räknats fram i kod.
 */
export async function suggestForFinding(finding: Finding): Promise<PageSuggestions[]> {
  const byPage = new Map<string, SuggestionItem[]>();
  const add = (url: string, item: SuggestionItem) => byPage.set(url, [...(byPage.get(url) ?? []), item]);

  // Färger räknas i kod. Exempel utan färgdata går vidare till modellen.
  const forModel: { n: number; ex: Finding["examples"][number] }[] = [];
  finding.examples.forEach((ex, i) => {
    if (finding.id === "color-contrast" && ex.contrast) {
      const fix = fixForeground(ex.contrast);
      const now = `${nf.format(ex.contrast.ratio)}:1`;
      add(ex.url, {
        target: ex.target,
        kind: fix ? "code" : "text",
        value: fix ? fix.color : "Ändra bakgrunden",
        note: fix
          ? `Textfärg i stället för ${ex.contrast.fg} på bakgrunden ${ex.contrast.bg}. Kontrasten går från ${now} till ${nf.format(fix.ratio)}:1, kravet är ${nf.format(ex.contrast.expected)}:1. Färgen är närmaste nyans som klarar kravet, kontrollera att den passar designen.`
          : `Kontrasten är ${now} och kravet ${nf.format(ex.contrast.expected)}:1, men ingen nyans av textfärgen ${ex.contrast.fg} klarar kravet mot ${ex.contrast.bg}. Bakgrunden behöver ändras.`,
      });
    } else {
      forModel.push({ n: i + 1, ex });
    }
  });

  if (forModel.length > 0) {
    const images = VISION_RULES.has(finding.id)
      ? forModel.flatMap(({ n, ex }) => {
          const url = imageOf(ex.html, ex.url);
          return url ? [{ url, label: `Bild till exempel ${n} (${url}):` }] : [];
        })
      : [];

    const examples = forModel
      .map(({ n, ex }) => `<exempel nummer="${n}">\nSida: ${ex.url}\nVäljare: ${ex.target}\nHTML: ${ex.html}\nFelbeskrivning: ${ex.summary || "saknas"}\n</exempel>`)
      .join("\n");
    const wcag = finding.criteria.length ? finding.criteria.map(criterionLabel).join(", ") : `nivå ${finding.level}`;
    const user = `Regel: ${finding.title} (${finding.id})\nVad regeln kräver: ${finding.description}\nWCAG: ${wcag}\n\nUppgift: ${TASKS[finding.id] ?? DEFAULT_TASK}\n\nSvara med items enligt schemat. example är exemplets nummer, ett eller flera items per exempel.\n\n${examples}`;
    const system = `${SYSTEM_BASE} Du skriver rättningar som en medarbetare kan klistra in i kundens sajt. Text som ska stå på sidan skrivs på sidans eget språk, annars svenska. Använd bara uppgifter som står i exemplen eller syns i bilderna. ${GUARD.replace("<sida>", "<exempel>")}`;

    const call = (withImages: boolean, timeout: number) =>
      ask({
        label: `a11y-suggest ${finding.id}`,
        effort: "low",
        system,
        user,
        schema: SCHEMA,
        images: withImages ? images : undefined,
        maxTokens: 6000,
        timeout,
      });
    // En bild som Anthropic inte når (inloggning, hotlink-skydd) får inte fälla allt.
    let raw = await call(images.length > 0, images.length > 0 ? 30_000 : 40_000);
    if (!raw && images.length > 0) raw = await call(false, 20_000);

    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        const items = Array.isArray((parsed as { items?: unknown }).items) ? ((parsed as { items: unknown[] }).items as Record<string, unknown>[]) : [];
        for (const i of items) {
          const ex = forModel.find((m) => m.n === i.example)?.ex;
          const target = clean(i.target, 300);
          if (!ex || !target || typeof i.value !== "string") continue;
          add(ex.url, { target, value: i.value.trim().slice(0, 3000), kind: i.kind === "code" ? "code" : "text", note: clean(i.note, 600) });
        }
      } catch {
        // Ogiltigt svar behandlas som inget svar.
      }
    }
  }

  const results = [...byPage].map(([url, items]): PageSuggestions => ({ url, items }));
  if (results.length === 0) {
    return [{ url: finding.examples[0]?.url ?? "", items: [], error: "Kunde inte ta fram förslag just nu." }];
  }
  return results;
}
