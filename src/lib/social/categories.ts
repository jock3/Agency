/**
 * Den rena delen av granskningen: typer och de sex bedömningsområdena. Ligger
 * i en egen fil utan serverimporter, eftersom verktyget i webbläsaren också
 * använder den.
 */

export type CategoryId = "budskap" | "grafik" | "text" | "plattform" | "varumarke" | "tillganglighet";
export type CategoryStatus = "bra" | "kan_forbattras" | "atgarda" | "ej_bedomd";

export interface ReviewCategory {
  id: CategoryId;
  status: CategoryStatus;
  comment: string;
  /** Konkret åtgärd. Tom när området är bra. */
  fix: string;
}

export interface SocialReview {
  summary: string;
  categories: ReviewCategory[];
  topFixes: string[];
  textAlternatives: { angle: string; text: string }[];
  altTexts: { image: number; text: string }[];
  /** Text som modellen läste i varje bild, så att läsaren kan se att den tolkat grafiken rätt. */
  readTexts: { image: number; text: string }[];
}

export const CATEGORIES: { id: CategoryId; label: string; weight: number; criteria: string }[] = [
  {
    id: "budskap",
    label: "Budskap och hook",
    weight: 25,
    criteria:
      "Stoppar inlägget scrollandet inom en till två sekunder? Är budskapet eller erbjudandet tydligt direkt? Bär textens första rad värde före ”mer”? Finns en tydlig uppmaning (CTA) när inlägget behöver en?",
  },
  {
    id: "grafik",
    label: "Grafik och komposition",
    weight: 20,
    criteria:
      "Visuell hierarki, komposition, bildkvalitet och om text i bilden går att läsa på en mobilskärm. Vid fullskärmsplacering: ligger viktig text eller logga utanför de ytor som gränssnittet täcker? I en karusell: finns en röd tråd och en anledning att svepa?",
  },
  {
    id: "text",
    label: "Text och språk",
    weight: 20,
    criteria:
      "Språk, stavning, ton, längd och struktur (radbrytningar, stycken). Kompletterar texten bilden i stället för att upprepa den? Är emoji och hashtaggar relevanta och rimligt många? Stava om och kontrollera även texten som står i bilderna.",
  },
  {
    id: "plattform",
    label: "Passar plattformen",
    weight: 15,
    criteria:
      "Känns inlägget hemma på just den här plattformen och placeringen, eller som en reklamfilm som klistrats in? Passar formatet, tonen och sättet att berätta? Påstå inte exakta plattformsregler du inte är säker på.",
  },
  {
    id: "varumarke",
    label: "Varumärke och målgrupp",
    weight: 10,
    criteria:
      "Stämmer inlägget med syfte, målgrupp och varumärkets tonläge som användaren angett? Har användaren inte angett något av detta: sätt status ej_bedomd och skriv att det går att bedöma när syfte, målgrupp och tonläge anges.",
  },
  {
    id: "tillganglighet",
    label: "Tillgänglighet",
    weight: 10,
    criteria:
      "Kontrast och storlek på text i bilden, om viktig information bara finns i bilden och inte i texten, om färg är enda bärare av betydelse, versaler genomgående, hashtaggar i flera ord utan stor bokstav (#attgöra i stället för #AttGöra) och emoji som läses upp störande.",
  },
];

export const CATEGORY_LABEL: Record<CategoryId, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<CategoryId, string>;
