import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, SESSION_COOKIE, validateSession, type ValidatedUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Åtkomst i annonsverktyget. Databasen är låst för anon och authenticated
 * (migration 0016) och all läsning sker här med service-role-nyckeln, så
 * isoleringen mellan företag avgörs av de här funktionerna och ingenting annat.
 *
 * Regel för alla senare steg: en fråga mot annonsdata får bara köras efter
 * `memberCompany(userId, companyId)`, och ska alltid filtrera på company_id.
 * Admin kan lägga till och ta bort medlemmar men ser inte ett företags data
 * utan att själv vara medlem.
 */

export interface Company {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  name: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Inloggad användare i en serversida. */
export async function currentUser(): Promise<ValidatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSession(token).catch(() => null);
}

/** Inloggad användare i en API-route. Proxyn har redan vänt bort kaklösa anrop,
 *  men kontrollen görs om här så att ett direkt anrop inte kan gå förbi den. */
export async function userFromRequest(request: NextRequest): Promise<ValidatedUser | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  return validateSession(token).catch(() => null);
}

export const adsError = (code: string, status = 400) => NextResponse.json({ error: code }, { status });

/** Företagen användaren är medlem i. */
export async function companiesOf(userId: string): Promise<Company[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("ad_company_members")
    .select("ad_companies(id, name)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const companies = (data ?? []).flatMap((row) => {
    const c = (row as unknown as { ad_companies: Company | Company[] | null }).ad_companies;
    return Array.isArray(c) ? c : c ? [c] : [];
  });
  return companies.sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

/**
 * Företaget, om användaren är medlem i det. Annars null, både för ett företag
 * som finns men tillhör någon annan och för ett som inte finns, så att svaret
 * inte avslöjar vilka id:n som är i bruk.
 */
export async function memberCompany(userId: string, companyId: string): Promise<Company | null> {
  if (!isUuid(companyId)) return null;
  const { data, error } = await getSupabaseAdminClient()
    .from("ad_company_members")
    .select("ad_companies(id, name)")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const c = (data as unknown as { ad_companies: Company | Company[] | null } | null)?.ad_companies;
  return (Array.isArray(c) ? c[0] : c) ?? null;
}

/** Medlemmarna i ett företag, med namn. Anropas bara efter medlemskaps- eller adminkontroll. */
export async function membersOf(companyId: string): Promise<Member[]> {
  const sb = getSupabaseAdminClient();
  const { data: rows, error } = await sb.from("ad_company_members").select("user_id").eq("company_id", companyId);
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((r) => r.user_id as string);
  if (ids.length === 0) return [];
  const { data: users, error: userError } = await sb.from("app_users").select("id, name").in("id", ids);
  if (userError) throw new Error(userError.message);
  return ((users ?? []) as Member[]).sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

/** Alla företag med medlemmar, för administrationen. Bara för admin. */
export async function adminOverview(): Promise<{ company: Company; members: Member[] }[]> {
  const sb = getSupabaseAdminClient();
  const [{ data: companies, error }, { data: links, error: linkError }, { data: users, error: userError }] = await Promise.all([
    sb.from("ad_companies").select("id, name").order("name"),
    sb.from("ad_company_members").select("company_id, user_id"),
    sb.from("app_users").select("id, name"),
  ]);
  if (error || linkError || userError) throw new Error((error ?? linkError ?? userError)!.message);
  const nameOf = new Map(((users ?? []) as Member[]).map((u) => [u.id, u.name]));
  return ((companies ?? []) as Company[]).map((company) => ({
    company,
    members: (links ?? [])
      .filter((l) => l.company_id === company.id)
      .map((l) => ({ id: l.user_id as string, name: nameOf.get(l.user_id as string) ?? "okänd" }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv")),
  }));
}

/** Användare vars namn matchar, utan hänsyn till versaler (som inloggningen). */
export async function findUserByName(name: string): Promise<Member | null> {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const { data, error } = await getSupabaseAdminClient().from("app_users").select("id, name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Member[]).find((u) => u.name.trim().toLowerCase() === wanted) ?? null;
}
