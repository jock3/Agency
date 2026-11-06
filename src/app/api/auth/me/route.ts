import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { toolsFor } from "@/lib/access/server";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ user: null });

  const user = await validateSession(token).catch(() => null);
  if (!user) return NextResponse.json({ user: null });

  const tools = await toolsFor(user).catch(() => []);
  return NextResponse.json({
    user: { id: user.user_id, name: user.name, isAdmin: user.is_admin, tools },
  });
}
