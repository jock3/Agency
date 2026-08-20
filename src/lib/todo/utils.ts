import { GROUP_COLORS, STATUSES } from "./constants";
import type { TodoRepeat, TodoStatus, TodoSubtask, TodoTask } from "@/lib/types";

export const todayISO = (): string => dkey(new Date());

export function dkey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseDate(k: string | null): Date | null {
  if (!k) return null;
  const [y, m, d] = String(k).split("-").map(Number);
  return y ? new Date(y, m - 1, d) : null;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }).replace(".", "");
}

export function fmtRange(a: string | null, b: string | null): string {
  if (!a && !b) return "";
  if (a && !b) return fmtDate(a) + " →";
  if (!a && b) return "→ " + fmtDate(b);
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}

/** Anything dated in the past that is not done. Works for tasks and subtasks. */
export function isOverdue(row: { due_date: string | null; status: TodoStatus }): boolean {
  return !!row.due_date && row.status !== "done" && row.due_date < todayISO();
}

/** How far into a start–end span we are right now, as a percentage. */
export function elapsedPct(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00").getTime();
  const e = new Date(end + "T23:59:59").getTime();
  const now = Date.now();
  if (e <= s) return now >= e ? 100 : 0;
  return Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
}

export function initials(name: string | null): string {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function hashColor(name: string | null): string {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + (name as string).charCodeAt(i)) >>> 0;
  return GROUP_COLORS[h % GROUP_COLORS.length];
}

export function countByStatus(tasks: { status: TodoStatus }[]): Record<TodoStatus, number> {
  const counts = {} as Record<TodoStatus, number>;
  for (const s of STATUSES) counts[s.key] = 0;
  for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1;
  return counts;
}

/** Outer bounds of a group's timelines, falling back to the due date. */
export function groupTimeline(tasks: TodoTask[]): { min: string | null; max: string | null } {
  let min: string | null = null;
  let max: string | null = null;
  for (const t of tasks) {
    const s = t.start_date || t.due_date || null;
    const e = t.end_date || t.due_date || null;
    if (s && (!min || s < min)) min = s;
    if (e && (!max || e > max)) max = e;
  }
  return { min, max };
}

/** Roll a date forward by one repeat interval. */
export function advanceDate(k: string, repeat: TodoRepeat): string {
  const d = parseDate(k);
  if (!d) return k;
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  else if (repeat === "weekdays") {
    do {
      d.setDate(d.getDate() + 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
  } else return k;
  return dkey(d);
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (!d) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "nyss";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} tim sedan`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd} d sedan`;
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function doneSubtasks(subs: TodoSubtask[]): number {
  return subs.filter((s) => s.status === "done").length;
}
