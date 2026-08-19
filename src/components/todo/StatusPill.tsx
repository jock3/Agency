"use client";

import { useRef, useState, useEffect } from "react";
import type { TodoStatus } from "@/lib/types";

export const STATUS_CONFIG: Record<TodoStatus, { label: string; bg: string; text: string }> = {
  ej_paborjad: { label: "Ej påbörjad", bg: "#F3F4F6", text: "#6B7280" },
  pagar:       { label: "Pågår",        bg: "#DBEAFE", text: "#1D4ED8" },
  klar:        { label: "Klar",         bg: "#D1FAE5", text: "#065F46" },
  avbruten:    { label: "Avbruten",     bg: "#FEE2E2", text: "#991B1B" },
};

interface Props {
  status: TodoStatus;
  onChange: (status: TodoStatus) => void;
}

export default function StatusPill({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status];

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
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-1 min-w-[150px]">
          {(Object.entries(STATUS_CONFIG) as [TodoStatus, (typeof STATUS_CONFIG)[TodoStatus]][]).map(([key, c]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
            >
              <span
                style={{ backgroundColor: c.bg, color: c.text }}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
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
