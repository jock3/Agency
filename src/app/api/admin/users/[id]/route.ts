import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/ads/access";
import { isToolKey } from "@/lib/access/tools";
import { adminError, requireAdmin, setRole, setTools } from "@/lib/admin/control";

type Context = { params: Promise<{ id: string }> };

/** Ändrar roll och/eller verktyg för en användare. Bara admin. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return adminError("USER_NOT_FOUND", 404);
  const body = await request.json().catch(() => null);

  try {
    if (body?.role !== undefined) {
      if (body.role !== "admin" && body.role !== "user") return adminError("INVALID_INPUT");
      const code = await setRole(auth.admin.user_id, id, body.role === "admin");
      if (code) return adminError(code, code === "USER_NOT_FOUND" ? 404 : 409);
    }
    if (body?.tools !== undefined) {
      if (!Array.isArray(body.tools) || !body.tools.every(isToolKey)) return adminError("INVALID_INPUT");
      await setTools(id, body.tools);
    }
  } catch (err) {
    // Främmande nyckel: användaren togs bort under tiden.
    if (err instanceof Error && /foreign key/i.test(err.message)) return adminError("USER_NOT_FOUND", 404);
    console.error("admin patch", err);
    return adminError("SERVER_ERROR", 500);
  }
  return NextResponse.json({ ok: true });
}
