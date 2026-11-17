"use client";

import { useEffect, useState } from "react";
import { formatAmount, parseAmount } from "@/lib/mediaplan/planmath";

/**
 * Talfält i mediaplanens tabell. Man kan skriva med komma ("2,5") och mellanslag
 * ("1 200"); värdet sparas när man lämnar fältet eller trycker Enter, och visas
 * då i samma form. Ogiltigt värde (bokstäver, minus) får röd ram och sparas inte.
 */
export default function CellInput({ value, onCommit, label, emptyAs = 0, placeholder, className = "", suffix, dark }: {
  value: number | null | undefined;
  onCommit: (v: number | null) => void;
  /** Läses upp av skärmläsare, eftersom fältet saknar synlig etikett. */
  label: string;
  /** Vad ett tomt fält betyder: 0 (pris, antal) eller null (räckvidd). */
  emptyAs?: 0 | null;
  placeholder?: string;
  className?: string;
  suffix?: string;
  /** Ljus text på mörk botten (rubrikens nyckeltal), vänsterställd. */
  dark?: boolean;
}) {
  const [text, setText] = useState(formatAmount(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(formatAmount(value)); }, [value, focused]);

  const parsed = parseAmount(text, emptyAs);
  const invalid = Number.isNaN(parsed);

  const commit = () => {
    setFocused(false);
    if (invalid) return;
    if (parsed !== (value ?? emptyAs)) onCommit(parsed);
    else setText(formatAmount(value));
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setText(formatAmount(value)); e.currentTarget.blur(); }
        }}
        className={`w-full h-[38px] px-2 border rounded-none tabular-nums focus:outline-none focus:ring-[3px] aria-[invalid=true]:border-[#E60330] ${dark ? "bg-transparent text-white border-[#6C6C6C] text-left placeholder:text-[#BDBDBD] focus:border-white focus:ring-[#931644]" : "bg-white text-gray-900 border-[#D6D6D6] text-sm text-right placeholder:text-gray-600 focus:border-gray-900 focus:ring-[#FCBEB7]"} ${suffix ? "pr-9" : ""} ${className}`}
      />
      {suffix && <span aria-hidden className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs ${dark ? "text-[#BDBDBD]" : "text-gray-600"}`}>{suffix}</span>}
    </div>
  );
}
