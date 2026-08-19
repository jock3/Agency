import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession, clearSessionCookie } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|share|_next|favicon.ico|api/auth).*)"],
};
