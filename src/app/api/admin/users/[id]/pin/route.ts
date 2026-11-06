import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/ads/access";
import { adminError, requireAdmin, setPin } from "@/lib/admin/control";

type Context = { params: Promise<{ id: string }> };

/** Ny PIN-kod för en användare som glömt sin. Bara admin. Loggar ut användaren. */
export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return adminError("USER_NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!/^\d{6}$/.test(pin)) return adminError("INVALID_PIN");

  try {
    const code = await setPin(auth.token, id, pin);
    if (code) return adminError(code, code === "USER_NOT_FOUND" ? 404 : code === "NOT_AUTHORIZED" ? 403 : 400);
  } catch (err) {
    console.error("admin pin", err);
    return adminError("SERVER_ERROR", 500);
  }
  return NextResponse.json({ ok: true });
}
