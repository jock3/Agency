import { NextRequest, NextResponse } from "next/server";
import { assistantEnabled, runAssistant, type ChatTurn } from "@/lib/audit/assistant";
import { auditError } from "@/lib/audit/server";
import { getSessionToken, validateSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_TURNS = 14;
const MAX_CHARS = 2000;

/**
 * Intern, bakom inloggning via proxy. SEO-assistenten för ett projekt.
 * Konversationen hålls i webbläsaren och skickas med varje fråga.
 */
export async function POST(request: NextRequest) {
  if (!assistantEnabled()) return auditError("AI_DISABLED", 503);

  const body = await request.json().catch(() => null);
  if (typeof body?.projectId !== "string" || !Array.isArray(body?.messages)) return auditError("NOT_FOUND", 404);

  const history: ChatTurn[] = (body.messages as unknown[])
    .flatMap((m) => {
      const t = m as { role?: unknown; content?: unknown };
      return (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim()
        ? [{ role: t.role, content: t.content.trim().slice(0, MAX_CHARS) } as ChatTurn]
        : [];
    })
    .slice(-MAX_TURNS);
  // Konversationen ska börja och sluta med användaren.
  while (history.length && history[0].role !== "user") history.shift();
  if (history.length === 0 || history[history.length - 1].role !== "user") return auditError("NOT_FOUND", 404);

  const sb = getSupabaseAdminClient();
  const { data: project } = await sb.from("audit_projects").select("id, name, domain, url").eq("id", body.projectId).maybeSingle();
  if (!project) return auditError("NOT_FOUND", 404);

  const token = getSessionToken(request);
  const user = token ? await validateSession(token).catch(() => null) : null;

  const result = await runAssistant({ sb, project, history, userName: user?.name ?? null });
  return NextResponse.json(result);
}
