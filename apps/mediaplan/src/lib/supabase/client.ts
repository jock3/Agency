import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = Record<string, any>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: SupabaseClient<AnyDatabase> | null = null;

export function getSupabaseClient(): SupabaseClient<AnyDatabase> {
  if (!client) {
    client = createClient<AnyDatabase>(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
