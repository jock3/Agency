import { NextRequest, NextResponse } from "next/server";
import {
  SUBTASK_FIELDS,
  badRequest,
  pick,
  requireUser,
  serverError,
  unauthorized,
} from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { TodoSubtask } from "@/lib/types";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const fields = pick<TodoSubtask>(body, SUBTASK_FIELDS);
  if (!fields.task_id || typeof fields.title !== "string") return badRequest();

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("todo_subtasks")
    .insert({ status: "todo", completed: false, sort_order: 0, ...fields })
    .select()
    .single();
  if (error) return serverError();

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const updates = pick<TodoSubtask>(body?.updates, SUBTASK_FIELDS);
  if (!id || Object.keys(updates).length === 0) return badRequest();

  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("todo_subtasks").update(updates).eq("id", id);
  if (error) return serverError();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return badRequest();

  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("todo_subtasks").delete().eq("id", id);
  if (error) return serverError();

  return NextResponse.json({ ok: true });
}
