"use client";

import { Check } from "lucide-react";
import { useRef, useState } from "react";
import Popover from "./Popover";
import { STATUSES, STATUS_MAP } from "@/lib/todo/constants";
import type { TodoStatus } from "@/lib/types";

interface Props {
  status: TodoStatus;
  onChange: (status: TodoStatus) => void;
  small?: boolean;
}

/** Solid colour-filled status cell — the colour is the label, so a full board
 *  reads as a heat map at a glance. */
export default function StatusPill({ status, onChange, small = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.todo;

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={"Status: " + cfg.label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{ background: cfg.color }}
        className={`w-full truncate rounded-md text-center font-medium text-white transition-opacity hover:opacity-90 ${
          small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1.5 text-xs"
        }`}
      >
        {cfg.label}
      </button>

      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={188}>
          <div className="grid gap-1">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
                style={{ background: s.color }}
                className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                {s.label}
                {s.key === status && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}
