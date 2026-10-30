/** Kontroller där "Ge förslag" kan skriva färdig text eller kod. Delas av servern
 *  och knapparna i webbläsaren, så filen får inte importera något serverspecifikt. */
export const SUGGESTABLE = new Set([
  "title",
  "description",
  "uniquedesc",
  "unique",
  "h1",
  "structure",
  "alt",
  "og",
  "schema",
  "org",
  "sameas",
  "questions",
  "content",
  "llms",
]);

/** Kontroller som gäller hela sajten och därför utgår från startsidan. */
export const SITE_LEVEL = new Set(["org", "sameas", "llms"]);

export interface SuggestionItem {
  /** Vad förslaget gäller: en bild, en rubrik, ett fält. */
  target: string;
  value: string;
  /** "code" visas i kodruta, till exempel JSON-LD eller HTML. */
  kind: "text" | "code";
  note: string;
}

export interface PageSuggestions {
  url: string;
  items: SuggestionItem[];
  error?: string;
}
