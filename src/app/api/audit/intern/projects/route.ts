import { NextRequest, NextResponse } from "next/server";
import { FetchError, normalizeUrl } from "@/lib/audit/fetch";
import { projectDomain } from "@/lib/audit/projects";
import { auditError } from "@/lib/audit/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Intern, bakom inloggning via proxy. Skapar ett projekt för en domän. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return auditError("INVALID_NAME");
  if (typeof body?.url !== "string") return auditError("INVALID_URL");

  let start: URL;
  try {
    start = normalizeUrl(body.url);
  } catch (err) {
    return auditError(err instanceof FetchError ? err.code : "INVALID_URL");
  }

  const token = getSessionToken(request);
  const user = token ? await validateSession(token).catch(() => null) : null;

  const { data, error } = await getSupabaseAdminClient()
    .from("audit_projects")
    .insert({ name, domain: projectDomain(start), url: start.toString(), created_by: user?.name ?? null })
    .select("id")
    .single();
  // 23505: unik-villkoret på domain.
  if (error?.code === "23505") return auditError("DUPLICATE", 409);
  if (error || !data) return auditError("SERVER_ERROR", 500);

  return NextResponse.json({ id: data.id });
}
