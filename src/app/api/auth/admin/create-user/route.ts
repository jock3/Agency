import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, adminCreateUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "NOT_AUTHORIZED" }, { status: 401 });

  const { name, pin } = await request.json();
  if (typeof name !== "string" || typeof pin !== "string") {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await adminCreateUser(token, name, pin);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : "NOT_AUTHORIZED";
    const status = error === "NOT_AUTHORIZED" ? 403 : 400;
    return NextResponse.json({ ok: false, error }, { status });
  }
}
