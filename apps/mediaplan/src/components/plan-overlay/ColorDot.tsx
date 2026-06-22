"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-3 h-3 rounded-full shrink-0 border border-white/30 hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
        title="Byt färg"
      />
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 w-24"
        >
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
        </div>,
        document.body
      )}
    </>
  );
}
