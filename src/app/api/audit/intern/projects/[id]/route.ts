import { NextRequest, NextResponse } from "next/server";
import { FetchError, normalizeUrl } from "@/lib/audit/fetch";
import { projectDomain } from "@/lib/audit/projects";
import { auditError } from "@/lib/audit/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/**
 * Intern, bakom inloggning via proxy. Byter namn och/eller domän på ett
 * projekt. Tidigare körningar ligger kvar i projektets historik.
 */
export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return auditError("INVALID_NAME");

  const update: { name: string; domain?: string; url?: string } = { name };
  if (body.url !== undefined) {
    if (typeof body.url !== "string") return auditError("INVALID_URL");
    try {
      const start = normalizeUrl(body.url);
      update.domain = projectDomain(start);
      update.url = start.toString();
    } catch (err) {
      return auditError(err instanceof FetchError ? err.code : "INVALID_URL");
    }
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("audit_projects")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  // 23505: unik-villkoret på domain.
  if (error?.code === "23505") return auditError("DUPLICATE", 409);
  if (error) return auditError("SERVER_ERROR", 500);
  if (!data) return auditError("NOT_FOUND", 404);

  return NextResponse.json({ id: data.id });
}

/** Tar bort ett projekt. Körningarna försvinner med det (on delete cascade). */
export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const { error } = await getSupabaseAdminClient().from("audit_projects").delete().eq("id", id);
  if (error) return auditError("SERVER_ERROR", 500);
  return NextResponse.json({ ok: true });
}
