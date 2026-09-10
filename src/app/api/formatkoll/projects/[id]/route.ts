import { NextRequest, NextResponse } from "next/server";
import { requireUser, serverError, unauthorized } from "@/lib/formatkoll/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  // Next 16: params är ett löfte och måste väntas in.
  const { id } = await params;

  try {
    const sb = getSupabaseAdminClient();
    const { data: project, error } = await sb
      .from("formatkoll_projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return serverError();
    if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const { data: assets, error: assetError } = await sb
      .from("formatkoll_assets")
      .select("*")
      .eq("project_id", id);
    if (assetError) return serverError();

    return NextResponse.json({ ...project, assets: assets ?? [] });
  } catch {
    return serverError();
  }
}
