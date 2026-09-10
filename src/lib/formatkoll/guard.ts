import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, validateSession, type ValidatedUser } from "@/lib/auth/session";

/** Middleware vänder redan bort kaklösa navigeringar. Kontrollen görs om här så
 *  ett direkt API-anrop inte kan gå förbi den. */
export async function requireUser(request: NextRequest): Promise<ValidatedUser | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  return validateSession(token).catch(() => null);
}

export const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
export const badRequest = (msg = "BAD_REQUEST") => NextResponse.json({ error: msg }, { status: 400 });
export const serverError = () => NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });

/** Fält klienten får skriva. En onämnd nyckel tappas i stället för att skickas
 *  vidare till PostgREST — klienten får aldrig namnge en kolumn. */
export const PROJECT_FIELDS = [
  "title",
  "client_name",
  "caption",
  "captions",
  "expires_at",
  "archived_at",
] as const;

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

export const RATIO_SEGMENT: Record<string, string> = {
  "9:16": "9x16",
  "1:1": "1x1",
  "16:9": "16x9",
};

export const isRatio = (v: unknown): v is "9:16" | "1:1" | "16:9" =>
  typeof v === "string" && v in RATIO_SEGMENT;

export const PREVIEW_BUCKET = "previews";

/** Sökvägen är alltid samma för en given slug och ett givet format, så en ny
 *  uppladdning skriver över den gamla i stället för att lämna skräp efter sig. */
export const storagePathFor = (slug: string, ratio: string) =>
  `${slug}/${RATIO_SEGMENT[ratio]}.mp4`;

export type { ValidatedUser };
