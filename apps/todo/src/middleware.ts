import { NextRequest, NextResponse } from "next/server";

async function computeToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("admin-session"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const secret = process.env.ADMIN_COOKIE_SECRET;

  if (!secret) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("admin_session")?.value ?? "";
  const expected = await computeToken(secret);

  if (cookie !== expected) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next|favicon.ico|api/auth|fonts).*)"],
};
