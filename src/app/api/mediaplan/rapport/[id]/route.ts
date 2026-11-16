import { NextRequest, NextResponse } from "next/server";
import { adsError, isUuid, memberCompany, userFromRequest } from "@/lib/ads/access";
import { normalizeDoc } from "@/lib/report/doc";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/** Rapportens företag-id om användaren är medlem i det. Annars null, samma svar som för okänt id. */
async function ownCompany(userId: string, id: string): Promise<string | null> {
  if (!isUuid(id)) return null;
  const { data } = await getSupabaseAdminClient().from("report_docs").select("company_id").eq("id", id).maybeSingle();
  const companyId = data?.company_id as string | undefined;
  return companyId && (await memberCompany(userId, companyId)) ? companyId : null;
}

/** Sparar hela dokumentet. Det valideras och rensas innan det skrivs. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!(await ownCompany(user.user_id, id))) return adsError("NOT_FOUND", 404);

  const body = await request.json().catch(() => null);
  const doc = normalizeDoc(body?.doc);
  if (!doc) return adsError("INVALID_DOC");

  const { error } = await getSupabaseAdminClient()
    .from("report_docs")
    .update({ doc, title: doc.meta.campaign || doc.meta.client, client: doc.meta.client, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ ok: true });
}

/** Tar bort rapporten. */
export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!(await ownCompany(user.user_id, id))) return adsError("NOT_FOUND", 404);
  const { error } = await getSupabaseAdminClient().from("report_docs").delete().eq("id", id);
  if (error) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ ok: true });
}
