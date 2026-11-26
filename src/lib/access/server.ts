import { type ValidatedUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { GRANTABLE_TOOLS, TOOL_KEYS, isToolKey, parseHiddenTools, type ToolKey } from "./tools";

/**
 * Verktygen användaren får använda. Admin har alltid alla. En användare utan
 * rad i agency_user_tools har också alla, så att konton som fanns innan
 * kontrollcentret fungerar som förut. Undantag: kanban läser Gustavs privata
 * vault och når bara admin, även om en gammal rad råkar innehålla det.
 */
export async function toolsFor(user: Pick<ValidatedUser, "user_id" | "is_admin">): Promise<ToolKey[]> {
  if (user.is_admin) return [...TOOL_KEYS];
  const { data, error } = await getSupabaseAdminClient().from("agency_user_tools").select("tools").eq("user_id", user.user_id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return [...GRANTABLE_TOOLS];
  return GRANTABLE_TOOLS.filter((t) => (data.tools as string[]).filter(isToolKey).includes(t));
}

/**
 * Verktygen användaren dolt. Raden i agency_user_hidden_tools gäller; saknas den
 * används kakan, och har kakan något flyttas det till kontot så att valet följer
 * med till andra enheter. Ett fel i databasen ger kakans värde, inte en krasch.
 */
export async function hiddenToolsFor(user: Pick<ValidatedUser, "user_id">, cookieValue: string | undefined): Promise<ToolKey[]> {
  const fromCookie = parseHiddenTools(cookieValue);
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("agency_user_hidden_tools").select("hidden").eq("user_id", user.user_id).maybeSingle();
  if (error) return fromCookie;
  if (data) return (data.hidden as string[]).filter(isToolKey);
  if (fromCookie.length > 0) await saveHiddenTools(user, fromCookie).catch(() => {});
  return fromCookie;
}

export async function saveHiddenTools(user: Pick<ValidatedUser, "user_id">, hidden: ToolKey[]): Promise<void> {
  const { error } = await getSupabaseAdminClient()
    .from("agency_user_hidden_tools")
    .upsert({ user_id: user.user_id, hidden, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
