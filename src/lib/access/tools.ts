/**
 * Verktygen som en admin kan ge eller ta ifrån en användare. Nyckeln är
 * verktygets sökväg utan snedstreck och lagras i agency_user_tools.tools.
 * Filen är ren (inga ikoner, ingen server-kod) så att proxyn, servern och
 * klienten kan läsa den.
 */
export const TOOL_KEYS = ["formatkoll", "social", "audit", "tillganglighet", "todo", "kanban"] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

export const TOOL_NAMES: Record<ToolKey, string> = {
  formatkoll: "Formatkoll",
  social: "Social media",
  audit: "SEO/GEO-audit",
  tillganglighet: "Tillgänglighet",
  todo: "Uppgifter",
  kanban: "Kanban",
};

/** Verktyg som bara admin når. Kan inte ges till andra i kontrollcentret. */
export const ADMIN_ONLY: readonly ToolKey[] = ["kanban"];
/** Verktygen en admin kan ge eller ta ifrån en vanlig användare. */
export const GRANTABLE_TOOLS: ToolKey[] = TOOL_KEYS.filter((k) => !ADMIN_ONLY.includes(k));

/**
 * Kaka med verktygen användaren själv har dolt på startsidan och i menyn.
 * Gäller bara visningen; åtkomsten styrs av kontrollcentret.
 */
export const HIDDEN_TOOLS_COOKIE = "hidden_tools";
/** Fönsterhändelse när valet ändras, så att menyn ritas om utan sidbyte. */
export const HIDDEN_TOOLS_EVENT = "hidden-tools-change";

export function parseHiddenTools(value: string | undefined): ToolKey[] {
  if (!value) return [];
  // En trasig kaka får inte kasta fel: då kraschar hubben och menyn.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return [];
  }
  return decoded.split(",").filter(isToolKey);
}

/** Verktygslistan från ett anrop, eller null om den inte är en lista med giltiga verktyg. Dubbletter tas bort. */
export function sanitizeHiddenTools(value: unknown): ToolKey[] | null {
  if (!Array.isArray(value) || !value.every(isToolKey)) return null;
  return [...new Set(value)];
}

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
