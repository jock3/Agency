import { ask, GUARD, type AskImage } from "@/lib/audit/ai";
import { CATEGORIES, type CategoryId, type CategoryStatus, type ReviewCategory, type SocialReview } from "./categories";
import type { SocialCheck } from "./checks";
import { platformLabel, type SocialPlatform } from "./platforms";

/**
 * AI-granskning av ett inlägg före publicering: grafik och text bedöms mot
 * plattformen. Claude bedömer sex områden och skriver förslag. Betyget räknas
 * i kod ur bedömningarna (scoreOf), och modellen sätter inget tal själv.
 * Reglerna står i docs/ai-rules.md.
 */

const STATUSES = ["bra", "kan_forbattras", "atgarda", "ej_bedomd"] as const;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: CATEGORIES.map((c) => c.id) },
          status: { type: "string", enum: [...STATUSES] },
          comment: { type: "string" },
          fix: { type: "string" },
        },
        required: ["id", "status", "comment", "fix"],
        additionalProperties: false,
      },
    },
    topFixes: { type: "array", items: { type: "string" } },
    textAlternatives: {
      type: "array",
      items: {
        type: "object",
        properties: { angle: { type: "string" }, text: { type: "string" } },
        required: ["angle", "text"],
        additionalProperties: false,
      },
    },
    altTexts: {
      type: "array",
      items: {
        type: "object",
        properties: { image: { type: "integer" }, text: { type: "string" } },
        required: ["image", "text"],
        additionalProperties: false,
      },
    },
    readTexts: {
      type: "array",
      items: {
        type: "object",
        properties: { image: { type: "integer" }, text: { type: "string" } },
        required: ["image", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "categories", "topFixes", "textAlternatives", "altTexts", "readTexts"],
  additionalProperties: false,
};

const SYSTEM = `Du är en senior social media manager på en svensk reklambyrå och granskar ett inlägg innan det publiceras. Skriv på svenska, rakt och konkret, utan fluff och utan att smickra. Säg ifrån när något inte fungerar och förklara varför. Ge aldrig generiska råd som ”posta konsekvent”: varje kommentar ska gå att koppla till något du ser i bilderna eller läser i texten.

Regler:
- Använd bara uppgifter som står i texten, syns i bilderna eller anges i briefen. Hitta aldrig på fakta om företaget, erbjudanden, priser, siffror eller citat. Saknas en uppgift i ett förslag skriver du [fyll i].
- Förutspå aldrig räckvidd, engagemang eller resultat, och hänvisa inte till siffror eller benchmarks du inte fått. Påstå inte hur algoritmen fungerar.
- Mått som format, upplösning och textlängd är redan uppmätta och står under ”Uppmätt”. Räkna inte om dem och sätt inga betyg.
- ${GUARD.replace("<sida>", "<inlagg>")} Det gäller också text som står inuti bilderna.
- Status per område: bra (inget väsentligt att ändra), kan_forbattras (fungerar men kan bli tydligt bättre), atgarda (ett problem som bör rättas före publicering), ej_bedomd (underlag saknas). Var kritisk: bra ska betyda bra, inte ”okej”.`;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface ReviewInput {
  platform: SocialPlatform;
  text: string;
  goal: string;
  audience: string;
  brand: string;
  checks: SocialCheck[];
  /** Bilderna som JPEG i base64, i den ordning användaren la dem. */
  images: string[];
}

function userPrompt(i: ReviewInput): string {
  const p = i.platform;
  const zone = p.placement.safe;
  const zones = p.fullscreen
    ? `\nGränssnittet täcker ungefär (procent av ytan, uppskattat): överkant ${zone.top} %, underkant ${zone.bottom} %, höger ${zone.right} %, vänster ${zone.left} %. Viktig text och logga bör ligga utanför dessa ytor.`
    : "";
  const measured = i.checks.map((c) => `- ${c.label}: ${c.detail}`).join("\n") || "- Inget uppmätt.";
  const brief = [i.goal && `Syfte: ${i.goal}`, i.audience && `Målgrupp: ${i.audience}`, i.brand && `Varumärke och tonläge: ${i.brand}`].filter(Boolean).join("\n");
  const areas = CATEGORIES.map((c) => `- ${c.id} (${c.label}): ${c.criteria}`).join("\n");
  const n = i.images.length;

  return `Plattform och placering: ${platformLabel(p)}${zones}

Brief:
${brief || "Ingen brief angiven."}

Uppmätt (räknat i kod):
${measured}

<inlagg>
${p.textLabel}: ${i.text.trim() || "(ingen text angiven)"}
Antal bilder: ${n}${n > 0 ? ". Bilderna är bifogade i ordning." : ""}
</inlagg>

Granska inlägget och fyll i schemat:
- summary: två till tre meningar om hur inlägget fungerar som helhet och vad som väger tyngst.
- categories: exakt ett objekt per område, i den här ordningen:
${areas}
  comment: vad du ser och varför det spelar roll (en till tre meningar). fix: konkret åtgärd, tom om status är bra eller ej_bedomd.
- topFixes: de tre viktigaste ändringarna i prioritetsordning, en rad var. Färre om inlägget är bra.
- textAlternatives: två alternativa texter med olika ansats (till exempel olika hook). angle: ansatsen på några ord. text: färdig text på samma språk som originalet, anpassad till ${platformLabel(p)}. ${p.fullscreen ? "Kort och läsbar i bild." : "Börja med en första rad som bär värde före ”mer”."} Hitta inte på fakta.
- altTexts: en bildbeskrivning per bild, högst 125 tecken, utan ”Bild på”. Är bilden ren dekor: tom text. Utelämna om inga bilder finns.
- readTexts: texten du läser i varje bild, ordagrant. Tom text om bilden saknar text. Utelämna om inga bilder finns.`;
}

/** Ur modellens svar till ett säkert SocialReview. Saknade områden blir ej_bedomd. */
export function parseReview(raw: string, imageCount: number): SocialReview | null {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);
  const imageOk = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= imageCount;

  const given = arr(json.categories);
  const categories: ReviewCategory[] = CATEGORIES.map((c) => {
    const g = given.find((x) => x.id === c.id);
    const status = STATUSES.find((s) => s === g?.status) ?? "ej_bedomd";
    return { id: c.id, status, comment: clean(g?.comment, 800), fix: status === "bra" || status === "ej_bedomd" ? "" : clean(g?.fix, 800) };
  });
  // Utan en enda bedömning finns inget att visa.
  if (categories.every((c) => c.status === "ej_bedomd" && !c.comment)) return null;

  const byImage = (v: unknown, max: number) =>
    arr(v)
      .filter((x) => imageOk(x.image))
      .map((x) => ({ image: x.image as number, text: clean(x.text, max) }))
      .slice(0, imageCount);

  return {
    summary: clean(json.summary, 1000),
    categories,
    topFixes: (Array.isArray(json.topFixes) ? json.topFixes : []).map((x) => clean(x, 400)).filter(Boolean).slice(0, 3),
    textAlternatives: arr(json.textAlternatives)
      .map((x) => ({ angle: clean(x.angle, 120), text: clean(x.text, 3000) }))
      .filter((x) => x.text)
      .slice(0, 2),
    altTexts: byImage(json.altTexts, 200),
    readTexts: byImage(json.readTexts, 1000),
  };
}

const WEIGHT_OF = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.weight])) as Record<CategoryId, number>;
const VALUE: Record<Exclude<CategoryStatus, "ej_bedomd">, number> = { bra: 1, kan_forbattras: 0.6, atgarda: 0.15 };

/**
 * Betyget 1–10, räknat i kod. Områdena vägs ihop efter vikt (ej bedömda
 * räknas inte), och varje uppmätt varning drar 0,5 och varje fel 1,5. 10 ges
 * bara när allt är bra. Vikterna är satta för hand och inte kalibrerade mot
 * mänskliga bedömningar. Bedömningarna kommer från AI och kan variera mellan
 * körningar.
 */
export function scoreOf(categories: ReviewCategory[], checks: SocialCheck[]): number | null {
  const rated = categories.filter((c): c is ReviewCategory & { status: Exclude<CategoryStatus, "ej_bedomd"> } => c.status !== "ej_bedomd");
  if (rated.length === 0) return null;
  const total = rated.reduce((n, c) => n + WEIGHT_OF[c.id], 0);
  const avg = rated.reduce((n, c) => n + WEIGHT_OF[c.id] * VALUE[c.status], 0) / total;
  const penalty = checks.reduce((n, c) => n + (c.status === "fail" ? 1.5 : c.status === "warn" ? 0.5 : 0), 0);
  const raw = 1 + 9 * avg - penalty;
  const perfect = rated.every((c) => c.status === "bra") && penalty === 0;
  return Math.max(1, Math.min(perfect ? 10 : 9, Math.round(raw)));
}

/** Granskar inlägget. Ger null om AI är avstängt eller svaret inte gick att använda. */
export async function reviewPost(input: ReviewInput): Promise<SocialReview | null> {
  const images: AskImage[] = input.images.map((base64, i) => ({
    base64,
    mediaType: "image/jpeg",
    label: `Bild ${i + 1} av ${input.images.length}:`,
  }));
  const raw = await ask({
    label: `social-review ${input.platform.id}`,
    effort: "medium",
    system: SYSTEM,
    user: userPrompt(input),
    schema: SCHEMA,
    images,
    // Rymmer även modellens tänkande, annars kapas svaret.
    maxTokens: 8000,
    timeout: 90_000,
  });
  return raw ? parseReview(raw, input.images.length) : null;
}
