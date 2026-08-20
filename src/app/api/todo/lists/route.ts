import { NextRequest, NextResponse } from "next/server";
import {
  LIST_FIELDS,
  badRequest,
  pick,
  requireUser,
  serverError,
  unauthorized,
} from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { TodoList } from "@/lib/types";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const fields = pick<TodoList>(body, LIST_FIELDS);
  if (!fields.name || !fields.color) return badRequest();

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("todo_lists")
    // created_by comes from the session, never from the request body.
    .insert({ ...fields, created_by: user.user_id })
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
  const updates = pick<TodoList>(body?.updates, LIST_FIELDS);
  if (!id || Object.keys(updates).length === 0) return badRequest();

  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("todo_lists").update(updates).eq("id", id);
  if (error) return serverError();

  return NextResponse.json({ ok: true });
}

/** Deleting a group takes its tasks and their subtasks with it — the board has
 *  no orphan bucket to strand them in. */
export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return badRequest();

  const sb = getSupabaseAdminClient();
  const { data: tasks, error: readError } = await sb
    .from("todo_tasks")
    .select("id")
    .eq("list_id", id);
  if (readError) return serverError();

  const ids = (tasks ?? []).map((t: { id: string }) => t.id);
  if (ids.length) {
    const { error: subError } = await sb.from("todo_subtasks").delete().in("task_id", ids);
    if (subError) return serverError();
    const { error: taskError } = await sb.from("todo_tasks").delete().in("id", ids);
    if (taskError) return serverError();
  }

  const { error } = await sb.from("todo_lists").delete().eq("id", id);
  if (error) return serverError();

  return NextResponse.json({ ok: true });
}
