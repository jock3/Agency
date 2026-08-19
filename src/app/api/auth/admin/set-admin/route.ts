import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, adminSetAdmin } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "NOT_AUTHORIZED" }, { status: 401 });

  const { userId, isAdmin } = await request.json();
  if (typeof userId !== "string" || typeof isAdmin !== "boolean") {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await adminSetAdmin(token, userId, isAdmin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : "NOT_AUTHORIZED";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }
}
