import { TOOL_KEYS, TOOL_NAMES, type ToolKey } from "@/lib/access/tools";

export const REQUEST_KINDS = { new: "Nytt verktyg", change: "Ändring i befintligt verktyg" } as const;
export type RequestKind = keyof typeof REQUEST_KINDS;

export const REQUEST_STATUSES = {
  new: "Ny",
  considering: "Funderar",
  planned: "Planerad",
  done: "Klar",
  declined: "Avböjd",
} as const;
export type RequestStatus = keyof typeof REQUEST_STATUSES;

export const LIMITS = { title: 120, body: 2000, why: 2000, reply: 1000 } as const;

export const isKind = (v: unknown): v is RequestKind => typeof v === "string" && v in REQUEST_KINDS;
export const isStatus = (v: unknown): v is RequestStatus => typeof v === "string" && v in REQUEST_STATUSES;

export { TOOL_KEYS, TOOL_NAMES };
export type { ToolKey };

/** Ett förslag som det visas i webbläsaren. */
export interface ToolRequest {
  id: string;
  kind: RequestKind;
  tool: ToolKey | null;
  title: string;
  body: string;
  why: string;
  status: RequestStatus;
  admin_reply: string | null;
  task_id: string | null;
  created_at: string;
  author: string;
  mine: boolean;
  votes: number;
  voted: boolean;
}
