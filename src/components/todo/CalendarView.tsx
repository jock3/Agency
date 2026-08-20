"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { MON_LONG, WEEKDAYS } from "@/lib/todo/constants";
import { dkey } from "@/lib/todo/utils";
import type { TodoList, TodoTask } from "@/lib/types";

interface Props {
  lists: TodoList[];
  tasks: TodoTask[];
  onOpen: (taskId: string) => void;
}

export default function CalendarView({ lists, tasks, onOpen }: Props) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const colorOf = useMemo(() => {
    const map = new Map(lists.map((l) => [l.id, l.color]));
    return (listId: string | null) => (listId && map.get(listId)) || "#9CA3AF";
  }, [lists]);

  const byDay = useMemo(() => {
    const m = new Map<string, TodoTask[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (!m.has(t.due_date)) m.set(t.due_date, []);
      m.get(t.due_date)!.push(t);
    }
    return m;
  }, [tasks]);

  const y = month.getFullYear();
  const mo = month.getMonth();
  const startOffset = (new Date(y, mo, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const todayK = dkey(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, mo, d));
  while (cells.length % 7) cells.push(null);

  return (
    <div className="px-6 pb-12 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMonth(new Date(y, mo - 1, 1))}
          aria-label="Föregående månad"
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-base font-semibold text-gray-900">
          {MON_LONG[mo]} {y}
        </h3>
        <button
          type="button"
          onClick={() => setMonth(new Date(y, mo + 1, 1))}
          aria-label="Nästa månad"
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ChevronRight size={18} />
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => {
            const t = new Date();
            t.setDate(1);
            t.setHours(0, 0, 0, 0);
            setMonth(t);
          }}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300"
        >
          Idag
        </button>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b border-gray-200 bg-gray-50 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400"
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-24 border-b border-r border-gray-100 bg-gray-50/40" />;
          const k = dkey(d);
          const items = byDay.get(k) ?? [];
          return (
            <div
              key={i}
              className={`min-h-24 border-b border-r border-gray-100 p-1.5 ${
                k === todayK ? "bg-milou-50/50" : ""
              }`}
            >
              <span
                className={`mb-1 inline-block text-xs ${
                  k === todayK ? "font-semibold text-milou-600" : "text-gray-400"
                }`}
              >
                {d.getDate()}
              </span>
              <div className="space-y-0.5">
                {items.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpen(t.id)}
                    title={t.title}
                    className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] transition-colors hover:bg-gray-100 ${
                      t.status === "done" ? "text-gray-400 line-through" : "text-gray-700"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: colorOf(t.list_id) }}
                    />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {items.length > 4 && (
                  <span className="block px-1 text-[10px] text-gray-400">
                    +{items.length - 4} till
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
