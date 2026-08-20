import { NextRequest, NextResponse } from "next/server";
import { requireUser, serverError, unauthorized } from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** One round trip for the whole board. The client has no other way in — the
 *  todo tables deny the anon role the browser bundle carries. */
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  try {
    const sb = getSupabaseAdminClient();
    const [lists, tasks, subtasks, users, settings] = await Promise.all([
      sb.from("todo_lists").select("*").order("sort_order"),
      sb.from("todo_tasks").select("*").order("sort_order"),
      sb.from("todo_subtasks").select("*").order("sort_order"),
      sb.rpc("app_list_users_public"),
      sb
        .from("todo_board_settings")
        .select("board_title, hidden_cols, automations")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const failed = [lists, tasks, subtasks, users, settings].find((r) => r.error);
    if (failed?.error) return serverError();

    return NextResponse.json({
      lists: lists.data ?? [],
      tasks: tasks.data ?? [],
      subtasks: subtasks.data ?? [],
      users: users.data ?? [],
      settings: settings.data ?? null,
    });
  } catch {
    return serverError();
  }
}
