"use client";

import { Fragment, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Rullande remsa i röd gradient, som på milou.se:s tjänstesidor. Kan pausas (WCAG 2.2.2). */
export default function Ticker({ items, label }: { items: string[]; label: string }) {
  const [paused, setPaused] = useState(false);
  if (items.length === 0) return null;

  // Raden upprepas så att en halva alltid är bredare än skärmen; slingan flyttar en halva.
  const row = Array.from({ length: Math.max(2, Math.ceil(8 / items.length)) }, () => items).flat();
  const half = (hidden: boolean) => (
    <div className="milou-ticker-half" aria-hidden={hidden || undefined}>
      {row.map((t, i) => (
        <Fragment key={i}>
          <span className="sep" aria-hidden>
            +
          </span>
          <span>{t}</span>
        </Fragment>
      ))}
    </div>
  );

  return (
    <div className="milou-ticker" data-paused={paused} role="region" aria-label={label}>
      <ul className="sr-only">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div className="milou-ticker-track" aria-hidden>
        {half(true)}
        {half(true)}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "Starta remsan" : "Pausa remsan"}
        className="milou-ticker-pause absolute right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {paused ? <Play className="w-4 h-4" aria-hidden /> : <Pause className="w-4 h-4" aria-hidden />}
      </button>
    </div>
  );
}
