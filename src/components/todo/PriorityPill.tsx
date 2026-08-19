"use client";

import { useRef, useState, useEffect } from "react";
import type { TodoPriority } from "@/lib/types";

export const PRIORITY_CONFIG: Record<TodoPriority, { label: string; bg: string; text: string }> = {
  none:   { label: "—",     bg: "#F9FAFB", text: "#9CA3AF" },
  low:    { label: "Låg",   bg: "#DBEAFE", text: "#1D4ED8" },
  medium: { label: "Medel", bg: "#FEF3C7", text: "#92400E" },
  high:   { label: "Hög",   bg: "#FEE2E2", text: "#991B1B" },
};

interface Props {
  priority: TodoPriority;
  onChange: (priority: TodoPriority) => void;
}

export default function PriorityPill({ priority, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = PRIORITY_CONFIG[priority];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{ backgroundColor: cfg.bg, color: cfg.text }}
        className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-opacity hover:opacity-80 w-full"
      >
        {cfg.label}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-1 min-w-[120px]">
          {(Object.entries(PRIORITY_CONFIG) as [TodoPriority, (typeof PRIORITY_CONFIG)[TodoPriority]][]).map(([key, c]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
            >
              <span
                style={{ backgroundColor: c.bg, color: c.text }}
                className="text-xs px-2 py-0.5 rounded-full font-medium border border-gray-100"
              >
                {c.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
