import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { hiddenToolsFor, toolsFor } from "@/lib/access/server";
import { HIDDEN_TOOLS_COOKIE } from "@/lib/access/tools";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ user: null });

  const user = await validateSession(token).catch(() => null);
  if (!user) return NextResponse.json({ user: null });

  const tools = await toolsFor(user).catch(() => []);
  const hiddenTools = await hiddenToolsFor(user, request.cookies.get(HIDDEN_TOOLS_COOKIE)?.value).catch(() => []);
  return NextResponse.json({
    user: { id: user.user_id, name: user.name, isAdmin: user.is_admin, tools, hiddenTools },
  });
}
