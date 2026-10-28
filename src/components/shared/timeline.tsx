"use client";

import { Plus, X } from "lucide-react";

/* Färgerna hör till gruppen (kategori i mediaplanen, kampanj i kampanjplanen):
   varje rad får en nyans av gruppens färg, så att staplarna syns som en grupp
   och grupperna skiljer sig åt. Radernas egna färgfält finns kvar i datan men
   styr inte längre ritningen. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number];
}

function mixHex(a: string, b: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

export function lineShade(base: string, idx: number): string {
  if (idx === 0) return base;
  const amount = Math.min(0.15 + idx * 0.2, 0.7);
  return isLight(base) ? mixHex(base, "#1C1C1C", amount * 0.6) : mixHex(base, "#FFFFFF", amount);
}

/** Bakgrund för tidslinjens körfält: en tunn linje vid varje vecka. */
export function laneStyle(weekCount: number): React.CSSProperties {
  return {
    gridColumn: `span ${weekCount}`,
    backgroundImage: "linear-gradient(to right, #EFEFEF 1px, transparent 1px)",
    backgroundSize: `${100 / weekCount}% 100%`,
  };
}

export const LANE = "relative border-b border-l border-gray-100 border-l-gray-200 bg-white";

/* ─── Små kontroller ────────────────────────────────────── */
export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-milou-500 transition-colors"
    >
      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
      {children}
    </button>
  );
}

export function DeleteButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="text-gray-300 hover:text-milou-500 transition-colors shrink-0">
      <X className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
