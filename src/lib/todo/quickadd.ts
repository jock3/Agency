import { dkey, fmtDate } from "./utils";
import { MON_SHORT } from "./constants";
import type { UserOption } from "@/lib/api/todo";
import type { TodoList, TodoPriority } from "@/lib/types";

/* Snabbinmatning: en rad text blir ett helt objekt. Kända ord plockas ut ur
   titeln och blir fält, resten är titeln.

     Formatkoll imorgon !hög @gustav #brovik
     -> titel "Formatkoll", datum imorgon, prioritet hög, person, grupp

   Första träffen per fält vinner, så ett andra datumord stannar i titeln. */

export interface ParsedTask {
  title: string;
  due: string | null;
  priority: Exclude<TodoPriority, "none"> | null;
  personId: string | null;
  listId: string | null;
}

const WEEKDAY: Record<string, number> = {
  sön: 0, söndag: 0,
  mån: 1, måndag: 1,
  tis: 2, tisdag: 2,
  ons: 3, onsdag: 3,
  tor: 4, torsdag: 4,
  fre: 5, fredag: 5,
  lör: 6, lördag: 6,
};

const PRIORITY: Record<string, Exclude<TodoPriority, "none">> = {
  "!": "high", "!!": "high", "!!!": "high",
  "!hög": "high", "!hog": "high", "!h": "high", "!1": "high",
  "!medel": "medium", "!m": "medium", "!2": "medium",
  "!låg": "low", "!lag": "low", "!l": "low", "!3": "low",
};

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/** Ett datum utan år hamnar i år, eller nästa år om det redan har passerat. */
function upcoming(day: number, monthIdx: number, today: Date): string | null {
  if (day < 1 || day > 31 || monthIdx < 0 || monthIdx > 11) return null;
  let d = new Date(today.getFullYear(), monthIdx, day);
  if (d.getMonth() !== monthIdx) return null;
  if (dkey(d) < dkey(today)) d = new Date(today.getFullYear() + 1, monthIdx, day);
  return dkey(d);
}

export function parseQuickAdd(
  input: string,
  users: UserOption[],
  lists: TodoList[],
  currentUserId: string | null,
  today: Date = new Date(),
): ParsedTask {
  const out: ParsedTask = { title: "", due: null, priority: null, personId: null, listId: null };
  const rest: string[] = [];
  const words = input.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    const w = raw.toLowerCase();
    const next = words[i + 1]?.toLowerCase();

    if (!out.due) {
      if (w === "idag") { out.due = dkey(today); continue; }
      if (w === "imorgon") { out.due = dkey(addDays(today, 1)); continue; }
      if (w === "i" && next === "morgon") { out.due = dkey(addDays(today, 1)); i++; continue; }
      if (w === "övermorgon") { out.due = dkey(addDays(today, 2)); continue; }
      if (w === "nästa" && next === "vecka") {
        const toMonday = ((8 - today.getDay()) % 7) || 7;
        out.due = dkey(addDays(today, toMonday));
        i++;
        continue;
      }
      if (w in WEEKDAY) {
        out.due = dkey(addDays(today, (WEEKDAY[w] - today.getDay() + 7) % 7));
        continue;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(w)) { out.due = w; continue; }
      const slash = w.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (slash) {
        const d = upcoming(Number(slash[1]), Number(slash[2]) - 1, today);
        if (d) { out.due = d; continue; }
      }
      if (/^\d{1,2}$/.test(w) && next) {
        const m = MON_SHORT.findIndex((s) => next.startsWith(s));
        const d = m >= 0 ? upcoming(Number(w), m, today) : null;
        if (d) { out.due = d; i++; continue; }
      }
    }

    if (!out.priority && w in PRIORITY) { out.priority = PRIORITY[w]; continue; }

    if (!out.personId && w.startsWith("@") && w.length > 1) {
      const q = w.slice(1);
      const id =
        (q === "jag" || q === "mig") && currentUserId
          ? currentUserId
          : users.find((u) => u.name.toLowerCase().startsWith(q))?.id;
      if (id) { out.personId = id; continue; }
    }

    if (!out.listId && w.startsWith("#") && w.length > 1) {
      const q = w.slice(1);
      const hit = lists.find((l) => l.name.toLowerCase().replace(/\s+/g, "").startsWith(q));
      if (hit) { out.listId = hit.id; continue; }
    }

    rest.push(raw);
  }

  out.title = rest.join(" ");
  return out;
}

/** "Idag", "Imorgon", veckodag inom en vecka, annars datum. */
export function dueLabel(iso: string, today: Date = new Date()): string {
  const t = dkey(today);
  if (iso === t) return "Idag";
  if (iso === dkey(addDays(today, 1))) return "Imorgon";
  if (iso === dkey(addDays(today, -1))) return "Igår";
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d.getTime() - new Date(t + "T00:00:00").getTime()) / 86400000);
  if (diff > 1 && diff < 7) {
    const name = d.toLocaleDateString("sv-SE", { weekday: "long" });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (diff < -1) return `${-diff} dagar sen`;
  return fmtDate(iso);
}
