"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import Popover, { PopItem } from "./Popover";
import { elapsedPct, fmtRange } from "@/lib/todo/utils";

interface Props {
  start: string | null;
  end: string | null;
  color: string;
  onChange: (start: string | null, end: string | null) => void;
}

/** Period bar with an elapsed-time overlay, so a glance shows both the span
 *  and how much of it is already gone. */
export default function TimelineCell({ start, end, color, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const has = Boolean(start || end);
  const pct = elapsedPct(start, end);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label="Tidslinje"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={has ? { background: color } : undefined}
        className={`relative w-full overflow-hidden rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 ${
          has ? "text-white" : "border border-dashed border-gray-300 text-gray-300"
        }`}
      >
        {has && <span className="absolute inset-y-0 left-0 bg-black/20" style={{ width: pct + "%" }} />}
        <span className="relative truncate">{has ? fmtRange(start, end) : "Ange period"}</span>
      </button>

      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={232}>
          <div className="space-y-2 p-2">
            <label className="block text-xs font-medium text-gray-500">
              Start
              <input
                type="date"
                value={start || ""}
                onChange={(e) => onChange(e.target.value || null, end)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-milou-300"
              />
            </label>
            <label className="block text-xs font-medium text-gray-500">
              Slut
              <input
                type="date"
                value={end || ""}
                onChange={(e) => onChange(start, e.target.value || null)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-milou-300"
              />
            </label>
            {has && (
              <PopItem
                onClick={() => {
                  onChange(null, null);
                  setOpen(false);
                }}
              >
                <X size={13} /> Rensa
              </PopItem>
            )}
          </div>
        </Popover>
      )}
    </>
  );
}
