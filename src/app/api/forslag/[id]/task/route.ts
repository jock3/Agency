import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireUser, serverError, unauthorized } from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { REQUEST_KINDS, TOOL_NAMES } from "@/lib/requests/types";

type Context = { params: Promise<{ id: string }> };

/** Admin: gör ett förslag till en uppgift på Uppgiftstavlan i vald lista. */
export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  if (!user.is_admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;

  const input = await request.json().catch(() => null);
  const listId = typeof input?.list_id === "string" ? input.list_id : null;
  if (!listId) return badRequest();

  const sb = getSupabaseAdminClient();
  const { data: req } = await sb.from("agency_tool_requests").select("*").eq("id", id).maybeSingle();
  if (!req) return badRequest();
  if (req.task_id) return NextResponse.json({ error: "ALREADY_LINKED" }, { status: 409 });

  const { data: list } = await sb.from("todo_lists").select("id").eq("id", listId).eq("archived", false).maybeSingle();
  if (!list) return badRequest();

  const { data: author } = req.created_by
    ? await sb.from("app_users").select("name").eq("id", req.created_by).maybeSingle()
    : { data: null };
  const notes = [
    `${REQUEST_KINDS[req.kind as keyof typeof REQUEST_KINDS]}${req.tool ? `: ${TOOL_NAMES[req.tool as keyof typeof TOOL_NAMES]}` : ""}`,
    `Föreslaget av ${author?.name ?? "okänd"}`,
    "",
    req.body,
    ...(req.why ? ["", `Varför: ${req.why}`] : []),
  ].join("\n");

  const { data: task, error } = await sb
    .from("todo_tasks")
    .insert({
      list_id: listId,
      title: `Förslag: ${req.title}`,
      notes,
      status: "todo",
      priority: "none",
      completed: false,
      comments: [],
      created_by: user.user_id,
    })
    .select("id")
    .single();
  if (error || !task) return serverError();

  // Ett nytt förslag blir "Planerad"; har admin redan satt en annan status lämnas den.
  const status = req.status === "new" || req.status === "considering" ? "planned" : req.status;
  const { error: linkError } = await sb
    .from("agency_tool_requests")
    .update({ task_id: task.id, status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (linkError) return serverError();

  return NextResponse.json({ task_id: task.id, status });
}
