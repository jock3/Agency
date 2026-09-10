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

/**
 * Signerad uppladdnings-URL. Filerna kan inte gå genom en route handler:
 * Vercels serverless-funktioner tar emot högst 4,5 MB kropp, och filmerna är
 * 25 MB och uppåt. Servern signerar i stället en engångs-URL med service-role,
 * och webbläsaren laddar upp direkt mot storage. Ingen skrivpolicy för anon
 * behöver finnas.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.project_id === "string" ? body.project_id : null;
  const ratio = body?.ratio;
  if (!projectId || !isRatio(ratio)) return badRequest();

  try {
    const sb = getSupabaseAdminClient();
    const { data: project, error } = await sb
      .from("formatkoll_projects")
      .select("slug")
      .eq("id", projectId)
      .maybeSingle();
    if (error) return serverError();
    if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const path = storagePathFor(project.slug, ratio);
    // upsert: samma sökväg skrivs över när en fil ersätts, annars vägrar storage.
    const { data, error: signError } = await sb.storage
      .from(PREVIEW_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });
    if (signError || !data) return serverError();

    return NextResponse.json({ path, token: data.token, signed_url: data.signedUrl });
  } catch {
    return serverError();
  }
}
