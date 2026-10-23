import { NextRequest, NextResponse } from "next/server";
import { auditError } from "@/lib/audit/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/** Intern, bakom inloggning via proxy. Byter namn på ett projekt. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return auditError("INVALID_NAME");

  const { data, error } = await getSupabaseAdminClient()
    .from("audit_projects")
    .update({ name })
    .eq("id", id)
    .select("id")
    .maybeSingle();
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
