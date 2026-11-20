import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireUser, serverError, unauthorized } from "@/lib/todo/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/** Slår av eller på användarens röst på ett förslag. */
export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  const { id } = await params;

  const sb = getSupabaseAdminClient();
  const { data: req } = await sb.from("agency_tool_requests").select("id").eq("id", id).maybeSingle();
  if (!req) return badRequest();

  const { data: existing } = await sb
    .from("agency_tool_request_votes")
    .select("request_id")
    .eq("request_id", id)
    .eq("user_id", user.user_id)
    .maybeSingle();

  const { error } = existing
    ? await sb.from("agency_tool_request_votes").delete().eq("request_id", id).eq("user_id", user.user_id)
    : await sb.from("agency_tool_request_votes").insert({ request_id: id, user_id: user.user_id });
  if (error) return serverError();

  return NextResponse.json({ voted: !existing });
}
