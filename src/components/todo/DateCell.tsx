"use client";

import { CalendarDays } from "lucide-react";
import { fmtDate } from "@/lib/todo/utils";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  overdue?: boolean;
}

/** A native date input hidden behind a pill: clicking anywhere opens the
 *  browser picker, which keeps keyboard and mobile behaviour for free. */
export default function DateCell({ value, onChange, overdue = false }: Props) {
  return (
    <label
      className={`relative flex w-full cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-gray-100 ${
        overdue ? "font-medium text-red-600" : value ? "text-gray-600" : "text-gray-300"
      }`}
    >
      <CalendarDays size={13} strokeWidth={1.75} />
      <span className="truncate">{value ? fmtDate(value) : "Datum"}</span>
      {overdue && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" title="Försenad" />}
      <input
        type="date"
        aria-label="Datum"
        value={value || ""}
        onClick={(e) => {
          e.stopPropagation();
          try {
            (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
          } catch {
            /* Safari has no showPicker; the native input still opens on click. */
          }
        }}
        onChange={(e) => onChange(e.target.value || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
