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

/** Status som tonad etikett med färgpunkt. Färgen bär betydelsen men skriker
 *  inte, så en full tavla går att läsa utan att bli ett lapptäcke. */
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
        style={{ background: cfg.color + "1F" }}
        className={`flex w-full items-center gap-1.5 truncate font-medium text-gray-800 transition-[filter] hover:brightness-95 ${
          small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1.5 text-xs"
        }`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.color }} aria-hidden />
        <span className="truncate">{cfg.label}</span>
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
                style={{ background: s.color + "1F" }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-gray-800 transition-[filter] hover:brightness-95"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="flex-1 text-left">{s.label}</span>
                {s.key === status && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}
