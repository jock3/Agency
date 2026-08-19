import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, adminListUsers } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "NOT_AUTHORIZED" }, { status: 401 });

  try {
    const users = await adminListUsers(token);
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    const error = err instanceof Error ? err.message : "NOT_AUTHORIZED";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }
}
