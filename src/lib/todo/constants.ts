import type {
  Automation,
  TodoColumnKey,
  TodoPriority,
  TodoRepeat,
  TodoStatus,
} from "@/lib/types";

export const STATUSES: { key: TodoStatus; label: string; color: string }[] = [
  { key: "done", label: "Klart", color: "#2EA45F" },
  { key: "working", label: "Pågår", color: "#D9952D" },
  { key: "stuck", label: "Fastnat", color: "#E5532B" },
  { key: "review", label: "Granskas", color: "#38948D" },
  { key: "todo", label: "Ej påbörjad", color: "#707074" },
];

export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s])) as Record<
  TodoStatus,
  (typeof STATUSES)[number]
>;

export const PRIORITIES: { key: Exclude<TodoPriority, "none">; label: string; color: string }[] = [
  { key: "high", label: "Hög", color: "#7C5CE0" },
  { key: "medium", label: "Medel", color: "#4E7FD9" },
  { key: "low", label: "Låg", color: "#8B96A3" },
];

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.key, p])) as Record<
  Exclude<TodoPriority, "none">,
  (typeof PRIORITIES)[number]
>;

/** Group colours. Deliberately not the Milou red — a group colour is a
 *  category marker, not a brand accent, and needs ten distinguishable hues. */
export const GROUP_COLORS = [
  "#3AA59C",
  "#FF582D",
  "#E0A93B",
  "#3BA55D",
  "#4E7FD9",
  "#7C5CE0",
  "#E0569E",
  "#D63B3B",
  "#3FA7C4",
  "#8B8B8E",
];

export const COLUMNS: { key: TodoColumnKey; label: string; width: number }[] = [
  { key: "person", label: "Person", width: 112 },
  { key: "status", label: "Status", width: 140 },
  { key: "priority", label: "Prioritet", width: 112 },
  { key: "date", label: "Datum", width: 118 },
  { key: "timeline", label: "Tidslinje", width: 172 },
  { key: "group", label: "Grupp", width: 150 },
];

export const DEFAULT_AUTOMATIONS: Automation[] = [
  { id: "a1", type: "move_on_status", enabled: false, config: { status: "done", listId: "" } },
  { id: "a2", type: "overdue_status", enabled: true, config: { status: "stuck" } },
  { id: "a3", type: "date_on_done", enabled: false, config: {} },
  { id: "a4", type: "default_status", enabled: true, config: { status: "todo" } },
  { id: "a5", type: "collapse_done", enabled: true, config: {} },
];

/** The order automations fire in when a status changes. */
export const AUTO_ORDER = ["date_on_done", "move_on_status", "collapse_done"] as const;

export const REPEAT_LABEL: Record<TodoRepeat, string> = {
  daily: "Dagligen",
  weekdays: "Varje vardag",
  weekly: "Veckovis",
  monthly: "Månadsvis",
};

export const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

export const MON_SHORT = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

export const MON_LONG = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];
