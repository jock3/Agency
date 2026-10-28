"use client";

import { Check } from "lucide-react";
import { useState } from "react";

interface Props {
  done: boolean;
  onToggle: () => void;
  label: string;
  size?: number;
  /** Ljus ring för mörk bakgrund. */
  onDark?: boolean;
}

/** Rund bocka-av-knapp. Att bocka av ger en kort gnista, det enda firandet i
 *  tavlan, så att det känns att något blev klart. */
export default function DoneCheck({ done, onToggle, label, size = 20, onDark = false }: Props) {
  const [burst, setBurst] = useState(0);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      title={done ? "Markera som ej klar" : "Markera som klar"}
      onClick={(e) => {
        e.stopPropagation();
        if (!done) setBurst((n) => n + 1);
        onToggle();
      }}
      style={{ width: size, height: size }}
      className={`done-check group/check relative inline-flex shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        done
          ? "border-[#2EA45F] bg-[#2EA45F] text-white"
          : onDark
            ? "border-white/40 text-transparent hover:border-white hover:text-white/70"
            : "border-gray-300 text-transparent hover:border-[#2EA45F] hover:text-[#2EA45F]"
      }`}
    >
      <Check size={Math.round(size * 0.6)} strokeWidth={3.5} aria-hidden />
      {burst > 0 && <span key={burst} className="done-burst" aria-hidden />}
    </button>
  );
}
