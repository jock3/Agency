import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireUser, serverError, unauthorized } from "@/lib/todo/guard";
import { saveHiddenTools } from "@/lib/access/server";
import { sanitizeHiddenTools } from "@/lib/access/tools";

/** Sparar verktygen användaren dolt, på kontot så att valet följer med till andra enheter. */
export async function PUT(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const raw = await request.json().catch(() => null);
  const hidden = sanitizeHiddenTools(raw?.hidden);
  if (!hidden) return badRequest();

  try {
    await saveHiddenTools(user, hidden);
  } catch {
    return serverError();
  }
  return NextResponse.json({ hidden });
}
