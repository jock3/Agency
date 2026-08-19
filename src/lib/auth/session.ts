import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function supabaseHeaders() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = typeof data?.message === "string" ? data.message : "REQUEST_FAILED";
    throw new Error(message);
  }
  return data as T;
}

export class AuthError extends Error {}

export interface AuthSession {
  token: string;
  user_id: string;
  name: string;
  is_admin: boolean;
}

interface AuthRpcRow {
  token: string | null;
  user_id: string | null;
  name: string | null;
  is_admin: boolean | null;
  error_code: string | null;
}

function unwrapAuthRow(row: AuthRpcRow): AuthSession {
  if (row.error_code || !row.token) throw new AuthError(row.error_code ?? "REQUEST_FAILED");
  return { token: row.token, user_id: row.user_id!, name: row.name!, is_admin: row.is_admin! };
}

export async function signup(name: string, pin: string): Promise<AuthSession> {
  const rows = await callRpc<AuthRpcRow[]>("app_signup", { p_name: name, p_pin: pin });
  return unwrapAuthRow(rows[0]);
}

export async function login(name: string, pin: string): Promise<AuthSession> {
  const rows = await callRpc<AuthRpcRow[]>("app_login", { p_name: name, p_pin: pin });
  return unwrapAuthRow(rows[0]);
}

export async function logoutToken(token: string): Promise<void> {
  await callRpc<null>("app_logout", { p_token: token });
}

export interface ValidatedUser {
  user_id: string;
  name: string;
  is_admin: boolean;
}

export async function validateSession(token: string): Promise<ValidatedUser | null> {
  const rows = await callRpc<ValidatedUser[]>("app_validate_session", { p_token: token });
  return rows[0] ?? null;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
}

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export interface AdminUserRow {
  id: string;
  name: string;
  is_admin: boolean;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

export async function adminListUsers(token: string): Promise<AdminUserRow[]> {
  return callRpc<AdminUserRow[]>("app_admin_list_users", { p_token: token });
}

export async function adminUnlockUser(token: string, targetUserId: string): Promise<void> {
  await callRpc<null>("app_admin_unlock_user", { p_token: token, p_target_user_id: targetUserId });
}

export async function adminSetAdmin(token: string, targetUserId: string, isAdmin: boolean): Promise<void> {
  await callRpc<null>("app_admin_set_admin", { p_token: token, p_target_user_id: targetUserId, p_is_admin: isAdmin });
}
