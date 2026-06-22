"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onAdd: (title: string) => void;
}

export default function AddTask({ onAdd }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      setEditing(true);
    };
    document.addEventListener("todo:new-task", handler);
    return () => document.removeEventListener("todo:new-task", handler);
  }, []);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [editing]);

  const submit = () => {
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2.5 px-2 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors w-full group"
      >
        <svg
          className="w-4 h-4 group-hover:text-milou-500 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Ny uppgift
      </button>
    );
  }

  return (
    <div className="pb-2">
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl border border-milou-300 bg-white shadow-sm">
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" style={{ minWidth: 16 }} />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setTitle(""); setEditing(false); }
          }}
          onBlur={submit}
          placeholder="Ny uppgift…"
          className="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1.5 pl-1">
        Enter för att spara · Esc för att avbryta
      </p>
    </div>
  );
}
