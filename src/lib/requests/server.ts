import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ToolRequest } from "./types";

/** Alla förslag med författarens namn, antal röster och om användaren själv röstat. */
export async function listRequests(userId: string): Promise<ToolRequest[]> {
  const sb = getSupabaseAdminClient();
  const [{ data: rows, error }, { data: votes, error: votesError }, { data: users }] = await Promise.all([
    sb.from("agency_tool_requests").select("*").order("created_at", { ascending: false }),
    sb.from("agency_tool_request_votes").select("request_id, user_id"),
    sb.from("app_users").select("id, name"),
  ]);
  if (error || votesError) throw new Error("REQUESTS_FAILED");

  const names = new Map((users ?? []).map((u) => [u.id as string, u.name as string]));
  const count = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes ?? []) {
    count.set(v.request_id, (count.get(v.request_id) ?? 0) + 1);
    if (v.user_id === userId) mine.add(v.request_id);
  }

  return (rows ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    tool: r.tool,
    title: r.title,
    body: r.body,
    why: r.why,
    status: r.status,
    admin_reply: r.admin_reply,
    task_id: r.task_id,
    created_at: r.created_at,
    author: (r.created_by && names.get(r.created_by)) || "Okänd",
    mine: r.created_by === userId,
    votes: count.get(r.id) ?? 0,
    voted: mine.has(r.id),
  }));
}
