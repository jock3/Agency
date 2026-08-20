"use client";

import { GanttChart } from "lucide-react";
import { useMemo } from "react";
import { MON_SHORT } from "@/lib/todo/constants";
import { daysBetween, dkey, parseDate } from "@/lib/todo/utils";
import type { TodoList, TodoTask } from "@/lib/types";

const DAY_W = 34;
const NAME_W = 210;

interface Props {
  lists: TodoList[];
  tasksByList: Record<string, TodoTask[]>;
  onOpen: (taskId: string) => void;
}

/** Gantt-style view. Only tasks with a start date are drawn — a bar without a
 *  beginning has nowhere to sit on the axis. */
export default function TimelineView({ lists, tasksByList, onOpen }: Props) {
  const dated = useMemo(
    () => lists.flatMap((l) => (tasksByList[l.id] ?? []).filter((t) => t.start_date)),
    [lists, tasksByList],
  );

  const range = useMemo(() => {
    if (!dated.length) {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return { a: new Date(t.getFullYear(), t.getMonth(), 1), b: new Date(t.getFullYear(), t.getMonth() + 1, 0) };
    }
    let min: Date | null = null;
    let max: Date | null = null;
    for (const t of dated) {
      const s = parseDate(t.start_date);
      const e = parseDate(t.end_date) ?? s;
      if (s && (!min || s < min)) min = s;
      if (e && (!max || e > max)) max = e;
    }
    const a = new Date(min!);
    a.setDate(a.getDate() - 2);
    const b = new Date(max!);
    b.setDate(b.getDate() + 2);
    return { a, b };
  }, [dated]);

  if (!dated.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center text-gray-400">
        <GanttChart size={30} />
        <p className="max-w-sm text-sm">
          Inga objekt med tidslinje än. Sätt en start- och slutperiod på ett objekt i tabellvyn, så
          ritas det här.
        </p>
      </div>
    );
  }

  const total = Math.max(1, daysBetween(range.a, range.b) + 1);
  const days: Date[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(range.a);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const todayK = dkey(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOff = daysBetween(range.a, today);

  return (
    <div className="px-6 pb-12 pt-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="relative" style={{ width: NAME_W + total * DAY_W }}>
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="shrink-0" style={{ width: NAME_W }} />
            {days.map((d, i) => (
              <div
                key={i}
                className={`shrink-0 py-1 text-center text-[10px] ${
                  [0, 6].includes(d.getDay()) ? "bg-gray-100/70" : ""
                } ${dkey(d) === todayK ? "font-semibold text-milou-600" : "text-gray-400"}`}
                style={{ width: DAY_W }}
              >
                {(d.getDate() === 1 || i === 0) && (
                  <span className="block text-[9px] uppercase text-gray-400">
                    {MON_SHORT[d.getMonth()]}
                  </span>
                )}
                <span>{d.getDate()}</span>
              </div>
            ))}
          </div>

          {todayOff >= 0 && todayOff < total && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 w-px bg-milou-400/60"
              style={{ left: NAME_W + todayOff * DAY_W + DAY_W / 2 }}
            />
          )}

          {lists.map((l) => {
            const its = (tasksByList[l.id] ?? []).filter((t) => t.start_date);
            if (!its.length) return null;
            return (
              <div key={l.id} className="border-b border-gray-100 last:border-b-0">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  style={{ color: l.color }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </div>
                {its.map((t) => {
                  const sd = parseDate(t.start_date)!;
                  const ed = parseDate(t.end_date) ?? sd;
                  const off = daysBetween(range.a, sd);
                  const span = Math.max(1, daysBetween(sd, ed) + 1);
                  return (
                    <div key={t.id} className="flex items-center">
                      <div
                        className="shrink-0 truncate px-3 py-1 text-xs text-gray-600"
                        style={{ width: NAME_W }}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                      <div className="relative h-7" style={{ width: total * DAY_W }}>
                        <button
                          type="button"
                          onClick={() => onOpen(t.id)}
                          title={`${t.title} · ${t.start_date}${
                            t.end_date && t.end_date !== t.start_date ? " – " + t.end_date : ""
                          }`}
                          className={`absolute top-1 flex h-5 items-center overflow-hidden rounded-full px-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90 ${
                            t.status === "done" ? "opacity-60" : ""
                          }`}
                          style={{
                            left: off * DAY_W,
                            width: span * DAY_W - 5,
                            background: l.color,
                          }}
                        >
                          <span className="truncate">{t.title}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
