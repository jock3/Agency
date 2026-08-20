import { NextRequest, NextResponse } from "next/server";
import {
  SETTINGS_FIELDS,
  badRequest,
  pick,
  requireUser,
  serverError,
  unauthorized,
} from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { BoardSettings } from "@/lib/types";

/** The board is a single shared row, so this always targets id = 1. */
export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const patch = pick<BoardSettings>(body, SETTINGS_FIELDS);
  if (Object.keys(patch).length === 0) return badRequest();

  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("todo_board_settings")
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() });
  if (error) return serverError();

  return NextResponse.json({ ok: true });
}
