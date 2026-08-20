"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface Props {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  align?: "left" | "right";
}

/** Fixed-positioned menu rendered into document.body so it escapes the board's
 *  scroll containers. Clamps to the viewport, flips up when it would overflow,
 *  and closes on outside click, Escape, scroll or resize. */
export default function Popover({ anchorRef, onClose, children, width = 220, align = "left" }: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; flip: boolean } | null>(null);

  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === "right" ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, vw - width - 8));
    const top = r.bottom + 6;
    setPos({ top, left, flip: false });
    requestAnimationFrame(() => {
      const el = popRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      if (top + h > vh - 8) setPos({ top: Math.max(8, r.top - h - 6), left, flip: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={popRef}
      role="menu"
      className="fixed z-[100] rounded-xl border border-gray-200 bg-white p-1 shadow-xl shadow-black/10"
      style={{ top: pos.top, left: pos.left, width }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* Shared menu building blocks so every popover in the board looks the same. */

export function PopLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </div>
  );
}

export function PopItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  indent = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
        indent ? "pl-6" : "",
        disabled ? "cursor-not-allowed text-gray-300" : danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function PopSeparator() {
  return <div className="my-1 h-px bg-gray-100" />;
}
