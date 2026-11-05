import { NextRequest, NextResponse } from "next/server";
import { adsError, userFromRequest } from "@/lib/ads/access";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Skapar ett företag. Bara admin. Den som skapar företaget blir medlem i det,
 * annars skulle hon inte kunna öppna det själv.
 */
export async function POST(request: NextRequest) {
  const user = await userFromRequest(request);
  if (!user) return adsError("UNAUTHORIZED", 401);
  if (!user.is_admin) return adsError("FORBIDDEN", 403);

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 120) return adsError("INVALID_NAME");

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from("ad_companies").insert({ name, created_by: user.user_id }).select("id").single();
  // 23505: unika namnet.
  if (error?.code === "23505") return adsError("DUPLICATE", 409);
  if (error || !data) return adsError("SERVER_ERROR", 500);

  const { error: memberError } = await sb.from("ad_company_members").insert({ company_id: data.id, user_id: user.user_id });
  if (memberError) return adsError("SERVER_ERROR", 500);

  return NextResponse.json({ id: data.id });
}
