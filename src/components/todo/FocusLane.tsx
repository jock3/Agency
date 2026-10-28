"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import DoneCheck from "./DoneCheck";
import { dueLabel } from "@/lib/todo/quickadd";
import { isOverdue, todayISO } from "@/lib/todo/utils";
import type { TodoList, TodoTask } from "@/lib/types";

export interface FocusItem {
  task: TodoTask;
  list: TodoList;
}

interface Props {
  items: FocusItem[];
  onComplete: (id: string) => void;
  onOpen: (id: string) => void;
}

/** De objekt som brinner mest: försenade, idag, sedan hög prioritet närmast i tid. */
export default function FocusLane({ items, onComplete, onOpen }: Props) {
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());

  const complete = (id: string) => {
    setLeaving((s) => new Set(s).add(id));
    setTimeout(() => {
      onComplete(id);
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 700);
  };

  return (
    <div className="mt-7">
      <h2 className="flex items-baseline gap-2">
        <span className="font-display font-bold text-base">Fokus nu</span>
        <span className="text-sm text-gray-500">det som brinner mest</span>
      </h2>

      {items.length === 0 ? (
        <p className="mt-3 bg-white/[0.06] px-4 py-5 text-gray-300">
          Inget försenat och inget som ska vara klart idag. Ta något från listan nedan.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {items.map(({ task, list }) => {
            const overdue = isOverdue(task);
            const due = task.due_date;
            return (
              <li
                key={task.id}
                className={`group relative flex gap-3 bg-white/[0.06] px-4 pb-4 pt-[18px] transition-colors hover:bg-white/[0.1] ${
                  leaving.has(task.id) ? "focus-leave" : ""
                }`}
              >
                <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: list.color }} aria-hidden />
                <DoneCheck
                  done={leaving.has(task.id)}
                  onToggle={() => !leaving.has(task.id) && complete(task.id)}
                  label={`Bocka av ${task.title}`}
                  size={24}
                  onDark
                />
                <button type="button" onClick={() => onOpen(task.id)} className="min-w-0 flex-1 text-left">
                  <span
                    className={`line-clamp-2 font-bold leading-snug ${leaving.has(task.id) ? "text-gray-400 line-through" : "text-white"}`}
                  >
                    {task.title}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {due && (
                      <span className={overdue ? "font-bold text-blush" : due === todayISO() ? "font-bold text-peach" : "text-gray-300"}>
                        {overdue ? `Försenad, ${dueLabel(due).toLowerCase()}` : dueLabel(due)}
                      </span>
                    )}
                    <span className="truncate text-gray-500">{list.name}</span>
                    {task.priority === "high" && (
                      <span className="flex items-center gap-1 text-gray-300">
                        <Flag size={11} strokeWidth={2.5} /> Hög
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

