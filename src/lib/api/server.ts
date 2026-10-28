import { cookies } from "next/headers";
import { SESSION_COOKIE, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Supabase client for the plan and campaign Server Functions.
 *
 * Server Functions are reachable by a direct POST, not only through the UI, so
 * every one of them starts here: no valid session cookie, no client. The tables
 * deny the anon role, so this is the only way in.
 */
export async function authedDb() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? await validateSession(token).catch(() => null) : null;
  if (!user) throw new Error("UNAUTHORIZED");
  return getSupabaseAdminClient();
}

/** Copies only the allowed keys across, so the browser never names a column
 *  such as `id` or `plan_id` in an update. */
export function pick<T extends object>(source: Partial<T>, allowed: readonly (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const key of allowed) {
    if (source && key in source) out[key] = source[key];
  }
  return out;
}
