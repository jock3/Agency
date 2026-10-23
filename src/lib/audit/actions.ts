import type { Check, CheckGroup } from "./types";

export type Priority = "critical" | "high" | "medium" | "nice";

export interface Action {
  id: string;
  group: CheckGroup;
  title: string;
  /** Vad granskningen hittade. */
  detail: string;
  /** Vad som bör göras. */
  fix: string;
  priority: Priority;
}

/** Underkänt väger tyngre än gult, och kontrollens vikt (1–4) avgör inom
 *  varje status. Godkända kontroller blir inga åtgärder. */
function priorityOf(c: Check): Priority {
  if (c.status === "fail") return c.weight >= 3 ? "critical" : c.weight === 2 ? "high" : "medium";
  return c.weight >= 3 ? "high" : c.weight === 2 ? "medium" : "nice";
}

const ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, nice: 3 };

export function toActions(checks: Check[]): Action[] {
  return checks
    .filter((c) => c.status !== "pass")
    .map((c) => ({ id: c.id, group: c.group, title: c.label, detail: c.detail, fix: c.fix, priority: priorityOf(c) }))
    .sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
}
