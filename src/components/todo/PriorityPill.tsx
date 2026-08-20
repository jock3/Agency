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
        style={cfg ? { background: cfg.color } : undefined}
        className={`flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 ${
          cfg ? "text-white" : "text-gray-300 hover:bg-gray-100"
        }`}
      >
        {cfg ? (
          <>
            <Flag size={11} strokeWidth={2.5} /> {cfg.label}
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
                style={{ background: p.color }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                <Flag size={12} strokeWidth={2.5} />
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
