import { NextRequest, NextResponse } from "next/server";
import {
  TASK_FIELDS,
  asIdList,
  badRequest,
  pick,
  requireUser,
  serverError,
  unauthorized,
} from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { TodoTask } from "@/lib/types";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const fields = pick<TodoTask>(body, TASK_FIELDS);
  if (!fields.list_id || typeof fields.title !== "string") return badRequest();

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("todo_tasks")
    .insert({
      status: "todo",
      priority: "none",
      completed: false,
      comments: [],
      ...fields,
      created_by: user.user_id,
    })
    .select()
    .single();
  if (error) return serverError();

  return NextResponse.json(data);
}

/** Accepts either a single id or a list, so bulk actions stay one round trip. */
export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const ids =
    typeof body?.id === "string" ? [body.id] : asIdList(body?.ids);
  const updates = pick<TodoTask>(body?.updates, TASK_FIELDS);
  if (!ids || !ids.length || Object.keys(updates).length === 0) return badRequest();

  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("todo_tasks").update(updates).in("id", ids);
  if (error) return serverError();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const ids = typeof body?.id === "string" ? [body.id] : asIdList(body?.ids);
  if (!ids || !ids.length) return badRequest();

  const sb = getSupabaseAdminClient();
  const { error: subError } = await sb.from("todo_subtasks").delete().in("task_id", ids);
  if (subError) return serverError();
  const { error } = await sb.from("todo_tasks").delete().in("id", ids);
  if (error) return serverError();

  return NextResponse.json({ ok: true });
}
