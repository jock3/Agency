import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ user: null });

  const user = await validateSession(token).catch(() => null);
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: { id: user.user_id, name: user.name, isAdmin: user.is_admin },
  });
}
