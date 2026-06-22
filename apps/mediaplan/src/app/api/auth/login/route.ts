import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

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

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookieSecret = process.env.ADMIN_COOKIE_SECRET;

  if (!adminPassword || !cookieSecret) {
    // Env vars not configured — redirect to dashboard (dev mode)
    return NextResponse.redirect(new URL("/", request.url));
  }

  const formData = await request.formData();
  const submitted = String(formData.get("password") ?? "");

  // Constant-time comparison to prevent timing attacks
  let passwordMatch = false;
  try {
    const a = Buffer.from(submitted);
    const b = Buffer.from(adminPassword);
    passwordMatch = a.length === b.length && timingSafeEqual(a, b);
  } catch {
    passwordMatch = false;
  }

  if (!passwordMatch) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  const token = await computeToken(cookieSecret);
  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}
