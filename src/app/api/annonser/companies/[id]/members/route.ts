import { NextRequest, NextResponse } from "next/server";
import { adsError, findUserById, findUserByName, isUuid, userFromRequest } from "@/lib/ads/access";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/** Lägger till en användare i ett företag, med id (valt ur listan) eller med namnet hon loggar in med. Bara admin. */
export async function POST(request: NextRequest, { params }: Context) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  if (!user.is_admin) return adsError("FORBIDDEN", 403);

  const { id } = await params;
  if (!isUuid(id)) return adsError("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const userId = typeof body?.userId === "string" ? body.userId : "";

  const sb = getSupabaseAdminClient();
  const { data: company } = await sb.from("ad_companies").select("id").eq("id", id).maybeSingle();
  if (!company) return adsError("NOT_FOUND", 404);

  const target = userId ? await findUserById(userId) : await findUserByName(name);
  if (!target) return adsError("USER_NOT_FOUND", 404);

  // Redan medlem är inget fel: resultatet är det som begärdes.
  const { error } = await sb.from("ad_company_members").upsert({ company_id: id, user_id: target.id }, { onConflict: "company_id,user_id", ignoreDuplicates: true });
  if (error) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ ok: true });
}

/** Tar bort en medlem ur ett företag. Bara admin. */
export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  if (!user.is_admin) return adsError("FORBIDDEN", 403);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!isUuid(id) || !isUuid(body?.userId)) return adsError("NOT_FOUND", 404);

  const { error } = await getSupabaseAdminClient().from("ad_company_members").delete().eq("company_id", id).eq("user_id", body.userId);
  if (error) return adsError("SERVER_ERROR", 500);
  return NextResponse.json({ ok: true });
}
