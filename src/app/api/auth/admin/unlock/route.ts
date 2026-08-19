import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, adminUnlockUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ ok: false, error: "NOT_AUTHORIZED" }, { status: 401 });

  const { userId } = await request.json();
  if (typeof userId !== "string") {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await adminUnlockUser(token, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : "NOT_AUTHORIZED";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }
}
