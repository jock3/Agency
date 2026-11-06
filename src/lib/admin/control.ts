import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession, type ValidatedUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { TOOL_KEYS, isToolKey, type ToolKey } from "@/lib/access/tools";

/**
 * Kontrollcentret: data och skrivningar för /admin. Allt går med
 * service-role-nyckeln, så varje route måste först passera `requireAdmin`.
 */

export const adminError = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

/** Admin bakom anropet, med sessionstoken (behövs för PIN-RPC:n), eller ett felsvar. */
export async function requireAdmin(
  request: NextRequest,
): Promise<{ admin: ValidatedUser; token: string } | { response: NextResponse }> {
  const token = getSessionToken(request);
  const admin = token ? await validateSession(token).catch(() => null) : null;
  if (!token || !admin) return { response: adminError("UNAUTHORIZED", 401) };
  if (!admin.is_admin) return { response: adminError("FORBIDDEN", 403) };
  return { admin, token };
}

export interface ControlUser {
  id: string;
  name: string;
  is_admin: boolean;
  locked: boolean;
  failed_attempts: number;
  created_at: string;
  /** null = alla verktyg (ingen begränsning sparad). */
  tools: ToolKey[] | null;
}

export async function listControlUsers(): Promise<ControlUser[]> {
  const sb = getSupabaseAdminClient();
  const [{ data: users, error }, { data: access, error: accessError }] = await Promise.all([
    sb.from("app_users").select("id, name, is_admin, failed_attempts, locked_until, created_at"),
    sb.from("agency_user_tools").select("user_id, tools"),
  ]);
  if (error || accessError) throw new Error((error ?? accessError)!.message);
  const toolsOf = new Map((access ?? []).map((a) => [a.user_id as string, (a.tools as string[]).filter(isToolKey)]));
  const now = Date.now();
  return (users ?? [])
    .map((u) => ({
      id: u.id as string,
      name: u.name as string,
      is_admin: u.is_admin === true,
      locked: !!u.locked_until && new Date(u.locked_until as string).getTime() > now,
      failed_attempts: (u.failed_attempts as number) ?? 0,
      created_at: u.created_at as string,
      tools: toolsOf.get(u.id as string) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

/** Sparar verktygen. Alla verktyg valda = ingen begränsning, så att nya verktyg följer med. */
export async function setTools(userId: string, tools: ToolKey[]): Promise<void> {
  const sb = getSupabaseAdminClient();
  const unique = TOOL_KEYS.filter((k) => tools.includes(k));
  const { error } =
    unique.length === TOOL_KEYS.length
      ? await sb.from("agency_user_tools").delete().eq("user_id", userId)
      : await sb.from("agency_user_tools").upsert({ user_id: userId, tools: unique, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Ändrar roll. Nekar att ta bort sin egen adminroll och att ta bort den sista admin. */
export async function setRole(adminId: string, userId: string, isAdmin: boolean): Promise<string | null> {
  if (userId === adminId && !isAdmin) return "SELF_DEMOTE";
  const sb = getSupabaseAdminClient();
  if (!isAdmin) {
    const { count, error } = await sb.from("app_users").select("id", { count: "exact", head: true }).eq("is_admin", true).neq("id", userId);
    if (error) throw new Error(error.message);
    if (!count) return "LAST_ADMIN";
  }
  const { data, error } = await sb.from("app_users").update({ is_admin: isAdmin }).eq("id", userId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) return "USER_NOT_FOUND";
  return null;
}

/** Ny PIN via RPC:n (bcrypt i databasen). Returnerar felkod eller null. */
export async function setPin(token: string, userId: string, pin: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdminClient().rpc("app_admin_set_pin", {
    p_token: token,
    p_target_user_id: userId,
    p_pin: pin,
  });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}
