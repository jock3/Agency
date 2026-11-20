import { type ValidatedUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { GRANTABLE_TOOLS, TOOL_KEYS, isToolKey, type ToolKey } from "./tools";

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
