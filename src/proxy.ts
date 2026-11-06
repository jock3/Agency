import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession, clearSessionCookie } from "@/lib/auth/session";
import { toolsFor } from "@/lib/access/server";
import { toolForPath } from "@/lib/access/tools";

export async function proxy(request: NextRequest) {
  const token = getSessionToken(request);

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await validateSession(token).catch(() => null);

  if (!user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearSessionCookie(response);
    return response;
  }

  // Verktygsåtkomst, satt i kontrollcentret. Ett fel vid uppslaget nekar
  // hellre än släpper igenom.
  const tool = toolForPath(request.nextUrl.pathname);
  if (tool && !user.is_admin) {
    const allowed: string[] = await toolsFor(user).catch(() => []);
    if (!allowed.includes(tool)) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "NO_TOOL_ACCESS" }, { status: 403 });
      }
      const url = new URL("/", request.url);
      url.searchParams.set("nekad", tool);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // The manifest and icons must load without a session: browsers fetch the
  // manifest without cookies, and a login redirect makes the app uninstallable.
  matcher: [
    "/((?!login|share|_next|favicon.ico|api/auth|api/public|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
