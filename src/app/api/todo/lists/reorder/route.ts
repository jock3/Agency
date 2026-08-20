import { NextRequest, NextResponse } from "next/server";
import { asIdList, badRequest, requireUser, serverError, unauthorized } from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Writes sort_order back for a whole group ordering in one call. */
export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const ids = asIdList(body?.ids);
  if (!ids || !ids.length) return badRequest();

  const sb = getSupabaseAdminClient();
  const results = await Promise.all(
    ids.map((id, i) => sb.from("todo_lists").update({ sort_order: i + 1 }).eq("id", id)),
  );
  if (results.some((r) => r.error)) return serverError();

  return NextResponse.json({ ok: true });
}
