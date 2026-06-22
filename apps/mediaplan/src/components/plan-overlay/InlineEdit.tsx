"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

interface Props {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "number";
  className?: string;
  style?: React.CSSProperties;
  darkMode?: boolean;
  placeholder?: string;
}

export default function InlineEdit({ value, onSave, type = "text", className, style, darkMode, placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={clsx(
          "border-0 outline-none bg-transparent px-0 focus:ring-1 focus:ring-indigo-400 rounded",
          darkMode ? "text-white caret-white" : "text-gray-900",
          className
        )}
        style={style}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={clsx(
        "cursor-text rounded px-0.5 -mx-0.5 truncate inline-block",
        "border-b border-transparent hover:border-dashed hover:border-current hover:opacity-80 transition-opacity",
        !value && "text-gray-400 italic",
        className
      )}
      style={style}
      title="Klicka för att redigera"
    >
      {value || placeholder || "–"}
    </span>
  );
}
