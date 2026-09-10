import { NextRequest, NextResponse } from "next/server";
import {
  PREVIEW_BUCKET,
  PROJECT_FIELDS,
  badRequest,
  pick,
  requireUser,
  serverError,
  unauthorized,
} from "@/lib/formatkoll/guard";
import { newSlug } from "@/lib/formatkoll/slug";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { FormatkollProject } from "@/lib/formatkoll/types";

/** Listan, sorterad på senast ändrad. Antalet filer per projekt räknas här så
 *  listvyn slipper ett anrop per rad. */
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  try {
    const sb = getSupabaseAdminClient();
    const [projects, assets] = await Promise.all([
      sb.from("formatkoll_projects").select("*").order("updated_at", { ascending: false }),
      sb.from("formatkoll_assets").select("project_id"),
    ]);
    if (projects.error || assets.error) return serverError();

    const counts = new Map<string, number>();
    for (const a of assets.data ?? []) {
      counts.set(a.project_id, (counts.get(a.project_id) ?? 0) + 1);
    }

    return NextResponse.json(
      (projects.data ?? []).map((p: FormatkollProject) => ({
        ...p,
        asset_count: counts.get(p.id) ?? 0,
      })),
    );
  } catch {
    return serverError();
  }
}

const DAY = 24 * 60 * 60 * 1000;
const ALLOWED_DAYS = [1, 3, 7];

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const clientName = typeof body?.client_name === "string" ? body.client_name.trim() : "";
  const days = ALLOWED_DAYS.includes(body?.days) ? (body.days as number) : 7;
  if (!title) return badRequest("TITLE_REQUIRED");

  try {
    const sb = getSupabaseAdminClient();
    const { data, error } = await sb
      .from("formatkoll_projects")
      .insert({
        slug: newSlug(),
        title,
        client_name: clientName,
        // created_by kommer från sessionen, aldrig från anropets kropp.
        created_by: user.user_id,
        expires_at: new Date(Date.now() + days * DAY).toISOString(),
      })
      .select()
      .single();
    if (error) return serverError();
    return NextResponse.json(data);
  } catch {
    return serverError();
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const updates = pick<FormatkollProject>(body?.updates, PROJECT_FIELDS);
  if (!id || Object.keys(updates).length === 0) return badRequest();

  try {
    const sb = getSupabaseAdminClient();
    const { error } = await sb
      .from("formatkoll_projects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return serverError();
    return NextResponse.json({ ok: true });
  } catch {
    return serverError();
  }
}

/** Raderar projektet, dess assetrader via cascade, och filerna i storage.
 *  Storage har ingen cascade — objekten måste bort explicit, annars ligger de
 *  kvar och är fortfarande nåbara för den som sparat länken. */
export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return badRequest();

  try {
    const sb = getSupabaseAdminClient();
    const { data: assets, error: readError } = await sb
      .from("formatkoll_assets")
      .select("storage_path")
      .eq("project_id", id);
    if (readError) return serverError();

    const paths = (assets ?? []).map((a: { storage_path: string }) => a.storage_path);
    if (paths.length) {
      const { error: rmError } = await sb.storage.from(PREVIEW_BUCKET).remove(paths);
      if (rmError) return serverError();
    }

    const { error } = await sb.from("formatkoll_projects").delete().eq("id", id);
    if (error) return serverError();
    return NextResponse.json({ ok: true });
  } catch {
    return serverError();
  }
}
