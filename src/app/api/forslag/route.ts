import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireUser, serverError, unauthorized } from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { LIMITS, TOOL_KEYS, isKind, type ToolKey } from "@/lib/requests/types";
import { listRequests } from "@/lib/requests/server";
import { notifyAdmins } from "@/lib/requests/notify";

const PER_HOUR = 10;

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await listRequests(user.user_id));
  } catch {
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const raw = await request.json().catch(() => null);
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const kind = raw?.kind;
  const title = text(raw?.title);
  const body = text(raw?.body);
  const why = text(raw?.why);
  const tool = kind === "change" ? raw?.tool : null;

  if (!isKind(kind)) return badRequest();
  if (kind === "change" && !(TOOL_KEYS as readonly string[]).includes(tool)) return badRequest();
  if (title.length < 3 || title.length > LIMITS.title) return badRequest();
  if (body.length < 1 || body.length > LIMITS.body || why.length > LIMITS.why) return badRequest();

  const sb = getSupabaseAdminClient();

  // Skydd mot att någon fyller tavlan: högst PER_HOUR förslag per timme och person.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from("agency_tool_requests")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.user_id)
    .gte("created_at", since);
  if ((count ?? 0) >= PER_HOUR) return NextResponse.json({ error: "TOO_MANY" }, { status: 429 });

  const { data, error } = await sb
    .from("agency_tool_requests")
    .insert({ created_by: user.user_id, kind, tool: tool as ToolKey | null, title, body, why })
    .select("id")
    .single();
  if (error || !data) return serverError();

  // Den som föreslår står bakom sitt eget förslag, så att rösträkningen börjar på 1.
  await sb.from("agency_tool_request_votes").insert({ request_id: data.id, user_id: user.user_id });

  await notifyAdmins({
    title: "Nytt verktygsförslag",
    body: `${user.name}: ${title}`,
    url: "/admin#forslag",
  }).catch(() => {});

  return NextResponse.json({ id: data.id });
}
