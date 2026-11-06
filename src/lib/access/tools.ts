/**
 * Verktygen som en admin kan ge eller ta ifrån en användare. Nyckeln är
 * verktygets sökväg utan snedstreck och lagras i agency_user_tools.tools.
 * Filen är ren (inga ikoner, ingen server-kod) så att proxyn, servern och
 * klienten kan läsa den.
 */
export const TOOL_KEYS = ["mediaplan", "kampanj", "formatkoll", "social", "audit", "tillganglighet", "todo"] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

export const TOOL_NAMES: Record<ToolKey, string> = {
  mediaplan: "Mediaplaner",
  kampanj: "Kampanjer",
  formatkoll: "Formatkoll",
  social: "Social media",
  audit: "SEO/GEO-audit",
  tillganglighet: "Tillgänglighet",
  todo: "Uppgifter",
};

export const isToolKey = (v: unknown): v is ToolKey => typeof v === "string" && (TOOL_KEYS as readonly string[]).includes(v);

/** API-prefix som hör till ett verktyg utan att heta som det. */
const API_ALIASES: Record<string, ToolKey> = { annonser: "social" };

/** Verktyget som en sökväg hör till, eller null för sidor som alla når (hubben, inloggning, delningslänkar). */
export function toolForPath(pathname: string): ToolKey | null {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0] === "api" ? parts[1] : parts[0];
  if (!first) return null;
  if (isToolKey(first)) return first;
  return API_ALIASES[first] ?? null;
}
