"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const PALETTE = [
  // Primära
  "#E60330", "#1C1C1C", "#FFDED0", "#2B2B2B", "#F2F2F2",
  // Sekundära
  "#FCBEB7", "#FF999C", "#931644", "#5B173C", "#35132B",
  // Gråskala
  "#AAAAAA", "#6C6C6C",
  // Tertiära (teal)
  "#16917A", "#C2EDE5", "#052D26",
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
        className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-transparent hover:border-white hover:scale-110 transition-all ring-1 ring-black/20"
        style={{ backgroundColor: color }}
        title="Byt färg"
      />
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl p-2 grid grid-cols-5 gap-1 w-32"
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
