import { ask, GUARD } from "@/lib/audit/ai";
import { fixForeground, ratioOf } from "./contrast";
import type { FigmaFrame, FigmaNode, FigmaPaint } from "./figma";

/**
 * Tillgänglighetskoll på en design (Figma). Färger, storlekar och mått mäts i
 * kod ur Figmas data; Claude tittar på bilden och bedömer det som inte går att
 * mäta (färg som enda signal, tillstånd, etiketter, läsordning). Ingen siffra
 * kommer från modellen. Reglerna står i docs/ai-rules.md.
 */

/** Skydd mot enorma filer: noder utöver taket ignoreras. */
const MAX_NODES = 4000;
const nf = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 });

export interface DesignFinding {
  kind: "contrast" | "small-text" | "target-size";
  /** WCAG-kriterium. */
  criterion: string;
  title: string;
  /** Antal ställen i framen. */
  count: number;
  examples: { text: string; note: string; fix?: string }[];
}

export interface Measured {
  findings: DesignFinding[];
  /** Texter vars bakgrund inte gick att avgöra (bild, toning, genomskinlighet). */
  unassessed: number;
  texts: number;
}

type Box = NonNullable<FigmaNode["absoluteBoundingBox"]>;

const hex2 = (v: number) =>
  Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, "0");
const toHex = (c: { r: number; g: number; b: number }) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;

/** Heltäckande, synlig, enfärgad fyllning, annars null. */
function solidOf(n: FigmaNode): string | null | "other" {
  const fills = (n.fills ?? []).filter((f: FigmaPaint) => f.visible !== false);
  if (fills.length === 0) return null;
  // Den översta fyllningen avgör; är den inte helt täckande går färgen inte att räkna ut.
  const top = fills[fills.length - 1];
  const alpha = (top.color?.a ?? 1) * (top.opacity ?? 1) * (n.opacity ?? 1);
  if (top.type !== "SOLID" || !top.color || alpha < 1) return "other";
  return toHex(top.color);
}

const covers = (outer: Box, inner: Box) =>
  outer.x <= inner.x + 0.5 && outer.y <= inner.y + 0.5 && outer.x + outer.width >= inner.x + inner.width - 0.5 && outer.y + outer.height >= inner.y + inner.height - 0.5;

/** Stor text enligt WCAG: 24 px, eller 18,66 px och fet. */
const isLarge = (size: number, weight: number) => size >= 24 || (size >= 18.66 && weight >= 700);

const INTERACTIVE = /button|knapp|btn|cta|checkbox|radio|toggle|switch|chip|icon[ -]?button|ikonknapp/i;
const TARGET_TYPES = new Set(["FRAME", "INSTANCE", "COMPONENT"]);

/** Mäter en frame i kod. Dolda lager hoppas över. */
export function measure(root: FigmaNode): Measured {
  // Lager i målningsordning (underst först), för att hitta vad som ligger bakom en text.
  const paint: FigmaNode[] = [];
  const walk = (n: FigmaNode) => {
    if (n.visible === false || paint.length >= MAX_NODES) return;
    paint.push(n);
    n.children?.forEach(walk);
  };
  walk(root);

  const contrast = new Map<string, DesignFinding>();
  let small: DesignFinding | null = null;
  const targets: DesignFinding = { kind: "target-size", criterion: "2.5.8", title: "Små klickytor", count: 0, examples: [] };
  let unassessed = 0;
  let texts = 0;

  paint.forEach((n, i) => {
    if (n.type === "TEXT" && n.characters?.trim() && n.absoluteBoundingBox) {
      texts++;
      const size = n.style?.fontSize ?? 16;
      const weight = n.style?.fontWeight ?? 400;
      const snippet = n.characters.trim().replace(/\s+/g, " ").slice(0, 60);

      if (size < 12) {
        small ??= { kind: "small-text", criterion: "1.4.4", title: "Mycket liten text (under 12 px)", count: 0, examples: [] };
        small.count++;
        if (small.examples.length < 3) small.examples.push({ text: snippet, note: `${nf.format(size)} px` });
      }

      const fg = solidOf(n);
      if (typeof fg !== "string" || fg === "other") return void unassessed++;
      // Översta lagret under texten som täcker den och har fyllning bestämmer bakgrunden.
      let bg: string | null | "other" = null;
      for (let j = i - 1; j >= 0 && bg === null; j--) {
        const b = paint[j];
        if (b.type === "TEXT" || !b.absoluteBoundingBox || !covers(b.absoluteBoundingBox, n.absoluteBoundingBox)) continue;
        bg = solidOf(b);
      }
      if (typeof bg !== "string" || bg === "other") return void unassessed++;

      const expected = isLarge(size, weight) ? 3 : 4.5;
      const ratio = ratioOf(fg, bg);
      if (ratio >= expected) return;
      const key = `${fg}|${bg}|${expected}`;
      const found = contrast.get(key) ?? { kind: "contrast" as const, criterion: "1.4.3", title: "För låg textkontrast", count: 0, examples: [] };
      found.count++;
      if (found.examples.length < 3) {
        const fix = fixForeground({ fg, bg, ratio, expected });
        found.examples.push({
          text: snippet,
          note: `Kontrast ${nf.format(ratio)}:1, kravet är ${nf.format(expected)}:1. Textfärg ${fg} på ${bg}.`,
          fix: fix ? `Textfärg ${fix.color} ger ${nf.format(fix.ratio)}:1. Närmaste nyans som klarar kravet, kontrollera att den passar designen.` : `Ingen nyans av ${fg} klarar kravet mot ${bg}. Bakgrunden behöver ändras.`,
        });
      }
      contrast.set(key, found);
      return;
    }

    // Klickytor hittas på lagrets namn, så listan är en fingervisning, inte en fullständig kontroll.
    const box = n.absoluteBoundingBox;
    if (TARGET_TYPES.has(n.type) && box && INTERACTIVE.test(n.name) && (box.width < 24 || box.height < 24)) {
      targets.count++;
      if (targets.examples.length < 3) targets.examples.push({ text: n.name, note: `${nf.format(box.width)}×${nf.format(box.height)} px, kravet är minst 24×24 px.` });
    }
  });

  const findings = [...contrast.values(), small, targets.count ? targets : null].filter((f): f is DesignFinding => Boolean(f));
  return { findings, unassessed, texts };
}

export type Status = "ok" | "improve" | "fix" | "unknown";

export interface AreaReview {
  area: string;
  status: Status;
  note: string;
}

/** Områden som inte går att mäta ur Figma-data och därför bedöms av Claude utifrån bilden. */
const AREAS = [
  { key: "color", label: "Färg som enda signal (1.4.1)", ask: "Förmedlas något bara med färg: fel, status, vald flik, länkar i löptext?" },
  { key: "states", label: "Fokus och tillstånd (2.4.7, 3.3.1)", ask: "Syns det att fokus, hover, felmeddelanden eller inaktiva tillstånd är ritade och tydliga? Saknas de i bilden är svaret unknown." },
  { key: "labels", label: "Etiketter och formulär (3.3.2)", ask: "Har formulärfält synliga etiketter (inte bara platshållartext)? Är knappar och ikoner begripliga utan gissning?" },
  { key: "structure", label: "Rubriker och läsordning (1.3.1, 2.4.6)", ask: "Går rubrikhierarkin och den visuella läsordningen att följa? Är sidans viktigaste innehåll först?" },
  { key: "images", label: "Bilder och alt-text (1.1.1)", ask: "Vilka bilder bär information och behöver alt-text, och vilka är dekor? Text inbakad i bilder är en brist." },
  { key: "text", label: "Läsbarhet (1.4.4, 1.4.12)", ask: "Är textstorlek, radavstånd och radlängd rimliga för läsning, och finns utrymme för att texten växer när användaren förstorar?" },
];

const SCHEMA = {
  type: "object",
  properties: {
    areas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: AREAS.map((a) => a.key) },
          status: { type: "string", enum: ["ok", "improve", "fix", "unknown"] },
          note: { type: "string" },
        },
        required: ["key", "status", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["areas"],
  additionalProperties: false,
};

const SYSTEM =
  "Du är en senior tillgänglighetsexpert som granskar en design på en svensk reklambyrå, innan något är byggt. Skriv på svenska, konkret och utan fluff. Du ser en bild av designen och en lista med det som redan är uppmätt i kod. Upprepa inte de uppmätta fynden. Föreslå aldrig färgkoder, kontrastvärden eller mått, och ange inga siffror. Bedöm bara det du faktiskt ser i bilden; kan du inte avgöra något, svara unknown och säg vad som saknas. Påstå aldrig att designen är godkänd, underkänd eller följer lagen: en bild räcker inte för att avgöra det. Hitta aldrig på uppgifter. " +
  GUARD.replace("<sida>", "<design>").replace("publik webbsida", "Figma-fil");

/** Bedömning av det som inte går att mäta. null om bild saknas eller AI inte svarar. */
export async function reviewDesign(frame: FigmaFrame, measured: Measured): Promise<AreaReview[] | null> {
  if (!frame.imageUrl) return null;
  const texts: string[] = [];
  const collect = (n: FigmaNode) => {
    if (n.visible === false || texts.length >= 60) return;
    if (n.type === "TEXT" && n.characters?.trim()) texts.push(n.characters.trim().replace(/\s+/g, " ").slice(0, 80));
    n.children?.forEach(collect);
  };
  collect(frame.node);

  const done = measured.findings.length ? measured.findings.map((f) => `- ${f.title}: ${f.count} ställen`).join("\n") : "- Inga brister i de uppmätta kontrollerna";
  const user = `Frame: ${frame.name}\n\nRedan uppmätt i kod:\n${done}\n\n<design>\nTexter i framen (urval):\n${texts.map((t) => `- ${t}`).join("\n")}\n</design>\n\nBedöm varje område utifrån bilden. Status: ok, improve (kan bli bättre), fix (åtgärda) eller unknown (går inte att avgöra). note är en eller två meningar.\n\n${AREAS.map((a) => `${a.key}: ${a.ask}`).join("\n")}`;

  const raw = await ask({
    label: "a11y-design",
    effort: "low",
    system: SYSTEM,
    user,
    schema: SCHEMA,
    images: [{ url: frame.imageUrl, label: `Bild av framen "${frame.name}":` }],
    maxTokens: 4000,
    timeout: 40_000,
  });
  if (!raw) return null;
  try {
    const items = (JSON.parse(raw) as { areas?: { key?: unknown; status?: unknown; note?: unknown }[] }).areas ?? [];
    return AREAS.map((a) => {
      const i = items.find((x) => x.key === a.key);
      const status = i && ["ok", "improve", "fix", "unknown"].includes(i.status as string) ? (i.status as Status) : "unknown";
      return { area: a.label, status, note: typeof i?.note === "string" ? i.note.trim().slice(0, 500) : "" };
    });
  } catch {
    return null;
  }
}
