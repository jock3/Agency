import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = Record<string, any>;

/**
 * Server-only client. Uses the service role key so it bypasses RLS —
 * only call from Route Handlers and Server Components after verifying
 * the admin session cookie.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient<AnyDatabase>(url, key, {
    auth: { persistSession: false },
  });
}
