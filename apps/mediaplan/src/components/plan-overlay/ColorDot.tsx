"use client";

import { useState, useRef, useEffect } from "react";

const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#ec4899", "#f43f5e", "#64748b",
];

interface Props {
  color: string;
  onChange: (color: string) => void;
}

export default function ColorDot({ color, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-3 h-3 rounded-full shrink-0 border border-white/30 hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
        title="Byt färg"
      />
      {open && (
        <div className="absolute left-0 top-5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 w-24">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              className="w-5 h-5 rounded-full hover:scale-125 transition-transform border-2"
              style={{
                backgroundColor: c,
                borderColor: c === color ? "white" : "transparent",
                outline: c === color ? `2px solid ${c}` : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
