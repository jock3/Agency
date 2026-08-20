import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Subscriptions are written here rather than from the browser so the owner is
 *  taken from the session cookie and cannot be spoofed by the client. */
async function requireUser(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return null;
  return validateSession(token).catch(() => null);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  const p256dh = typeof body?.p256dh === "string" ? body.p256dh : null;
  const auth = typeof body?.auth === "string" ? body.auth : null;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();
  // Re-subscribing the same endpoint replaces the row rather than duplicating it.
  await sb.from("todo_app_push_subs").delete().eq("endpoint", endpoint);
  const { error } = await sb
    .from("todo_app_push_subs")
    .insert({ app_user_id: user.user_id, endpoint, p256dh, auth });
  if (error) return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  if (!endpoint) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const sb = getSupabaseAdminClient();
  await sb
    .from("todo_app_push_subs")
    .delete()
    .eq("endpoint", endpoint)
    .eq("app_user_id", user.user_id);

  return NextResponse.json({ ok: true });
}
