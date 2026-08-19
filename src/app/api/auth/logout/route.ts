import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, logoutToken, clearSessionCookie } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);
  if (token) await logoutToken(token).catch(() => {});

  const response = NextResponse.redirect(new URL("/login", request.url));
  clearSessionCookie(response);
  return response;
}
