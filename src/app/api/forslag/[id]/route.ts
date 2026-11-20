import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireUser, serverError, unauthorized } from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { LIMITS, isStatus } from "@/lib/requests/types";

type Context = { params: Promise<{ id: string }> };

const forbidden = () => NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

/** Admin: sätter status och/eller svar. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  if (!user.is_admin) return forbidden();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const updates: Record<string, unknown> = {};
  if (body && "status" in body) {
    if (!isStatus(body.status)) return badRequest();
    updates.status = body.status;
  }
  if (body && "admin_reply" in body) {
    const reply = typeof body.admin_reply === "string" ? body.admin_reply.trim() : null;
    if (reply === null || reply.length > LIMITS.reply) return badRequest();
    updates.admin_reply = reply === "" ? null : reply;
  }
  if (Object.keys(updates).length === 0) return badRequest();

  const { error } = await getSupabaseAdminClient()
    .from("agency_tool_requests")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return serverError();
  return NextResponse.json({ ok: true });
}

/** Admin: tar bort ett förslag, till exempel skräp. */
export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  if (!user.is_admin) return forbidden();
  const { id } = await params;

  const { error } = await getSupabaseAdminClient().from("agency_tool_requests").delete().eq("id", id);
  if (error) return serverError();
  return NextResponse.json({ ok: true });
}
