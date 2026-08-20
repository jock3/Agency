import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession, type ValidatedUser } from "@/lib/auth/session";

/** Resolves the caller from the httpOnly session cookie. The middleware already
 *  turns cookie-less browser navigations away; this repeats the check so a
 *  direct API call cannot slip past it. */
export async function requireUser(request: NextRequest): Promise<ValidatedUser | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  return validateSession(token).catch(() => null);
}

export const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
export const badRequest = () => NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
export const serverError = () => NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });

/** Copies only the allowed keys across. Clients never get to name a column —
 *  an unlisted key is dropped rather than forwarded to PostgREST. */
export function pick<T extends object>(source: unknown, allowed: readonly (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  if (!source || typeof source !== "object") return out;
  const record = source as Record<string, unknown>;
  for (const key of allowed) {
    const k = key as string;
    if (k in record) out[key] = record[k] as T[keyof T];
  }
  return out;
}

export const LIST_FIELDS = [
  "name",
  "color",
  "sort_order",
  "collapsed",
  "archived",
  "archived_at",
] as const;

export const TASK_FIELDS = [
  "list_id",
  "title",
  "notes",
  "completed",
  "status",
  "priority",
  "due_date",
  "start_date",
  "end_date",
  "repeat",
  "comments",
  "overdue_key",
  "sort_order",
  "completed_at",
  "assigned_to",
] as const;

export const SUBTASK_FIELDS = [
  "task_id",
  "title",
  "completed",
  "status",
  "due_date",
  "assigned_to",
  "sort_order",
] as const;

export const SETTINGS_FIELDS = ["board_title", "hidden_cols", "automations"] as const;

export function asIdList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((v) => typeof v === "string")) return null;
  return value as string[];
}

export type { ValidatedUser };
