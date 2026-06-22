"use client";

import { useState } from "react";
import clsx from "clsx";
import type { TodoTask, TodoList } from "@/lib/types";
import PriorityBadge from "@/components/PriorityBadge";
import { format, isToday, isPast, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

interface Props {
  task: TodoTask;
  lists: TodoList[];
  isSelected: boolean;
  onSelect: () => void;
  onComplete: (completed: boolean) => void;
  onDelete: () => void;
}

export default function TaskItem({ task, lists, isSelected, onSelect, onComplete, onDelete }: Props) {
  const [animating, setAnimating] = useState(false);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimating(true);
    setTimeout(() => {
      onComplete(!task.completed);
      setAnimating(false);
    }, 250);
  };

  const dueDateBadge = (() => {
    if (!task.due_date || task.completed) return null;
    const date = parseISO(task.due_date);
    if (isToday(date)) return <span className="text-xs text-milou-500 font-medium">Idag</span>;
    if (isPast(date)) return (
      <span className="text-xs bg-milou-100 text-milou-600 px-1.5 py-0.5 rounded-md font-medium">
        Försenad
      </span>
    );
    return <span className="text-xs text-gray-400">{format(date, "d MMM", { locale: sv })}</span>;
  })();

  const list = lists.find((l) => l.id === task.list_id);

  return (
    <div
      onClick={onSelect}
      className={clsx(
        "group flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none",
        isSelected ? "bg-gray-100 shadow-sm" : "hover:bg-gray-50",
        animating && "opacity-40 scale-98"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={clsx(
          "mt-0.5 rounded-full border-2 shrink-0 transition-all flex items-center justify-center",
          task.completed
            ? "bg-milou-500 border-milou-500"
            : "border-gray-300 hover:border-milou-400 hover:bg-milou-50"
        )}
        style={{ width: 18, height: 18, minWidth: 18 }}
      >
        {task.completed && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={clsx(
            "text-sm leading-snug transition-all",
            task.completed ? "line-through text-gray-400" : "text-gray-900"
          )}
        >
          {task.title}
        </p>
        {(dueDateBadge || task.priority !== "none" || list) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {dueDateBadge}
            <PriorityBadge priority={task.priority} />
            {list && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: list.color }} />
                {list.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Delete on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 shrink-0 mt-0.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
