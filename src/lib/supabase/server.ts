import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = Record<string, any>;

/**
 * Server-only client. Uses the service role key so it bypasses RLS —
 * only call from Route Handlers and Server Components after verifying
 * the admin session cookie.
 *
 * Falls back to the anon key, which only reaches tables whose policies still
 * allow the anon role. Use `getSupabaseAdminClient` for anything that must not
 * depend on that.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient<AnyDatabase>(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Service-role client with no anon fallback. The todo tables deny the anon role
 * outright, so falling back would turn a missing env var into empty boards and
 * silently failing writes instead of a loud error.
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side todo access");
  }
  return createClient<AnyDatabase>(url, key, { auth: { persistSession: false } });
}
