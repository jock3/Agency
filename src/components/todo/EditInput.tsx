"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  className?: string;
  placeholder?: string;
}

/** Inline rename field: selects its contents on mount, commits on Enter or
 *  blur, reverts on Escape. */
export default function EditInput({ value, onCommit, onCancel, className = "", placeholder }: Props) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(draft.trim());
        }
        if (e.key === "Escape") {
          e.preventDefault();
          cancelled.current = true;
          onCancel();
        }
      }}
      onBlur={() => {
        if (cancelled.current) return;
        onCommit(draft.trim());
      }}
      className={`min-w-0 rounded-md border border-milou-400 bg-white px-1.5 py-0.5 text-sm outline-none ring-2 ring-milou-100 ${className}`}
    />
  );
}
