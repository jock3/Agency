"use client";

import { Check, Flag, X } from "lucide-react";
import { useRef, useState } from "react";
import Popover, { PopItem } from "./Popover";
import { PRIORITIES, PRIORITY_MAP } from "@/lib/todo/constants";
import type { TodoPriority } from "@/lib/types";

interface Props {
  priority: TodoPriority;
  onChange: (priority: TodoPriority) => void;
}

export default function PriorityPill({ priority, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const cfg = priority !== "none" ? PRIORITY_MAP[priority] : null;

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={"Prioritet: " + (cfg ? cfg.label : "ingen")}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 ${
          cfg ? "text-gray-800" : "justify-center text-gray-300"
        }`}
      >
        {cfg ? (
          <>
            <Flag size={12} strokeWidth={2.5} style={{ color: cfg.color }} fill={priority === "high" ? cfg.color : "none"} /> {cfg.label}
          </>
        ) : (
          "–"
        )}
      </button>

      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={172}>
          <div className="grid gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  onChange(p.key);
                  setOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100"
              >
                <Flag size={12} strokeWidth={2.5} style={{ color: p.color }} fill={p.key === "high" ? p.color : "none"} />
                <span className="flex-1 text-left">{p.label}</span>
                {p.key === priority && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
            <PopItem
              onClick={() => {
                onChange("none");
                setOpen(false);
              }}
            >
              <X size={13} /> Rensa
            </PopItem>
          </div>
        </Popover>
      )}
    </>
  );
}
