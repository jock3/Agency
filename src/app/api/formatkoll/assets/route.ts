import { NextRequest, NextResponse } from "next/server";
import {
  PREVIEW_BUCKET,
  badRequest,
  isRatio,
  requireUser,
  serverError,
  storagePathFor,
  unauthorized,
} from "@/lib/formatkoll/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Registrerar en fil som just laddats upp. Anropas efter att uppladdningen mot
 *  den signerade URL:en gått igenom — inte före, annars kan raden peka på ett
 *  objekt som aldrig kom fram. */
export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.project_id === "string" ? body.project_id : null;
  const ratio = body?.ratio;
  const filename = typeof body?.filename === "string" ? body.filename : null;
  if (!projectId || !isRatio(ratio) || !filename) return badRequest();

  try {
    const sb = getSupabaseAdminClient();
    const { data: project, error } = await sb
      .from("formatkoll_projects")
      .select("slug")
      .eq("id", projectId)
      .maybeSingle();
    if (error) return serverError();
    if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const now = new Date().toISOString();
    const { data: asset, error: upsertError } = await sb
      .from("formatkoll_assets")
      .upsert(
        {
          project_id: projectId,
          ratio,
          storage_path: storagePathFor(project.slug, ratio),
          filename,
          size_bytes: num(body?.size_bytes),
          width: num(body?.width),
          height: num(body?.height),
          updated_at: now,
        },
        { onConflict: "project_id,ratio" },
      )
      .select()
      .single();
    if (upsertError) return serverError();

    await sb.from("formatkoll_projects").update({ updated_at: now }).eq("id", projectId);
    return NextResponse.json(asset);
  } catch {
    return serverError();
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.project_id === "string" ? body.project_id : null;
  const ratio = body?.ratio;
  if (!projectId || !isRatio(ratio)) return badRequest();

  try {
    const sb = getSupabaseAdminClient();
    const { data: asset, error } = await sb
      .from("formatkoll_assets")
      .select("storage_path")
      .eq("project_id", projectId)
      .eq("ratio", ratio)
      .maybeSingle();
    if (error) return serverError();
    if (!asset) return NextResponse.json({ ok: true });

    const { error: rmError } = await sb.storage.from(PREVIEW_BUCKET).remove([asset.storage_path]);
    if (rmError) return serverError();

    const { error: delError } = await sb
      .from("formatkoll_assets")
      .delete()
      .eq("project_id", projectId)
      .eq("ratio", ratio);
    if (delError) return serverError();

    await sb
      .from("formatkoll_projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId);
    return NextResponse.json({ ok: true });
  } catch {
    return serverError();
  }
}
