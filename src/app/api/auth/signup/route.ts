import { NextRequest, NextResponse } from "next/server";
import { AuthError, fullNameOf, setSessionCookie, signup } from "@/lib/auth/session";

/** Skapar ett eget konto med för- och efternamn och PIN, och loggar in direkt. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = fullNameOf(body?.firstName, body?.lastName);
  if (!name) return NextResponse.json({ ok: false, error: "INVALID_NAME" }, { status: 400 });
  if (typeof body?.pin !== "string" || !/^[0-9]{6}$/.test(body.pin)) {
    return NextResponse.json({ ok: false, error: "INVALID_PIN" }, { status: 400 });
  }

  try {
    const session = await signup(name, body.pin);
    const response = NextResponse.json({ ok: true, user: { id: session.user_id, name: session.name, isAdmin: session.is_admin } });
    setSessionCookie(response, session.token);
    return response;
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    console.error("signup failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
