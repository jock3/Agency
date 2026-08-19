import { NextRequest, NextResponse } from "next/server";
import { login, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const { name, pin } = await request.json();

  if (typeof name !== "string" || typeof pin !== "string") {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const session = await login(name, pin);
    const response = NextResponse.json({
      ok: true,
      user: { id: session.user_id, name: session.name, isAdmin: session.is_admin },
    });
    setSessionCookie(response, session.token);
    return response;
  } catch (err) {
    const error = err instanceof Error ? err.message : "INVALID_CREDENTIALS";
    return NextResponse.json({ ok: false, error }, { status: 401 });
  }
}
