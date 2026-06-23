"use client";

import clsx from "clsx";
import type { TodoTask, TodoStatus } from "@/lib/types";
import { STATUS_CONFIG, STATUS_CYCLE } from "@/components/StatusBadge";
import { format, isToday, isPast, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

const PRIORITY_CONFIG = {
  none:   { label: "—",     bg: "transparent", color: "#3d3d3d" },
  low:    { label: "Låg",   bg: "#1e3a5f",     color: "#60a5fa" },
  medium: { label: "Medel", bg: "#3d2400",     color: "#f59e0b" },
  high:   { label: "Hög",   bg: "#3d0012",     color: "#f87171" },
};
const PRIORITIES = ["none", "low", "medium", "high"] as const;

interface Props {
  task: TodoTask;
  colClass: string;
  isSelected: boolean;
  onSelect: () => void;
  onComplete: (completed: boolean) => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<TodoTask>) => void;
}

export default function TaskItem({ task, colClass, isSelected, onSelect, onComplete, onDelete, onUpdate }: Props) {
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.ej_paborjad;
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.none;

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];
    onUpdate({ status: next });
  };

  const cyclePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = PRIORITIES.indexOf(task.priority);
    onUpdate({ priority: PRIORITIES[(idx + 1) % PRIORITIES.length] });
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete(!task.completed);
  };

  const dueDateNode = (() => {
    if (!task.due_date) return null;
    const date = parseISO(task.due_date);
    const label = format(date, "d MMM", { locale: sv });
    if (task.status === "klar") return <span className="text-xs text-[#555]">{label}</span>;
    if (isToday(date)) return <span className="text-xs text-milou-400 font-medium">Idag</span>;
    if (isPast(date)) return <span className="text-xs text-red-400 font-medium">Försenad</span>;
    return <span className="text-xs text-[#888]">{label}</span>;
  })();

  return (
    <div
      onClick={onSelect}
      className={clsx(
        `group grid ${colClass} border-b border-[#1e1e1e] cursor-pointer transition-colors`,
        isSelected ? "bg-[#222]" : "hover:bg-[#1e1e1e]"
      )}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center py-2.5">
        <button
          onClick={handleComplete}
          className={clsx(
            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
            task.completed ? "bg-milou-500 border-milou-500" : "border-[#3d3d3d] hover:border-milou-400"
          )}
        >
          {task.completed && (
            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Title */}
      <div className="flex items-center py-2.5 pr-2 min-w-0">
        <span className={clsx("text-sm truncate", task.completed ? "line-through text-[#555]" : "text-[#d4d4d4]")}>
          {task.title}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center py-2 px-1">
        <button
          onClick={cycleStatus}
          title="Byt status"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
          className="text-xs px-2 py-1 rounded font-medium whitespace-nowrap w-full text-center hover:opacity-80 transition-opacity"
        >
          {statusCfg.label}
        </button>
      </div>

      {/* Priority */}
      <div className="flex items-center py-2 px-1">
        {task.priority !== "none" ? (
          <button
            onClick={cyclePriority}
            title="Byt prioritet"
            style={{ backgroundColor: priorityCfg.bg, color: priorityCfg.color }}
            className="text-xs px-2 py-1 rounded font-medium whitespace-nowrap w-full text-center hover:opacity-80 transition-opacity"
          >
            {priorityCfg.label}
          </button>
        ) : (
          <button
            onClick={cyclePriority}
            title="Sätt prioritet"
            className="text-[#2d2d2d] hover:text-[#555] w-full text-center text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity"
          >
            +
          </button>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center py-2 px-1">
        {dueDateNode ?? (
          <svg className="w-3.5 h-3.5 text-[#2d2d2d] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Delete */}
      <div className="flex items-center justify-center py-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 text-[#3d3d3d] hover:text-red-400 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
