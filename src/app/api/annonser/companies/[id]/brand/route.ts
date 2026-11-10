import { NextRequest, NextResponse } from "next/server";
import { adsError } from "@/lib/ads/access";
import { requireMember } from "@/lib/ads/assets";
import { parseBrand } from "@/lib/ads/brand";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/** Sparar företagets skrivguide, bildspråk och förebilder. Bara medlemmar. Hela dokumentet skrivs i ett enda anrop. */
export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const auth = await requireMember(request, id);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const brand = parseBrand(body);
  if (!brand) return adsError("INVALID_BRAND");

  const { error } = await getSupabaseAdminClient()
    .from("ad_brand")
    .upsert({ company_id: id, ...brand, updated_by: auth.user.user_id, updated_at: new Date().toISOString() });
  if (error) {
    console.error("ads brand save", error.message);
    return adsError("SERVER_ERROR", 500);
  }
  return NextResponse.json({ ok: true, ...brand });
}
