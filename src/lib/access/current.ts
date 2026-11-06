import { cookies } from "next/headers";
import { SESSION_COOKIE, validateSession, type ValidatedUser } from "@/lib/auth/session";
import { toolsFor } from "./server";
import type { ToolKey } from "./tools";

/** Inloggad användare i en serversida, med sina verktyg. */
export async function currentUserWithTools(): Promise<(ValidatedUser & { tools: ToolKey[] }) | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await validateSession(token).catch(() => null);
  if (!user) return null;
  return { ...user, tools: await toolsFor(user) };
}
