"use client";

import { useState } from "react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagEditor({ tags, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const value = draft.trim();
    if (!value || tags.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 h-7 text-xs font-bold bg-peach text-gray-900 pl-2.5 pr-1"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="w-5 h-5 flex items-center justify-center text-gray-700 hover:text-gray-900 leading-none"
            title="Ta bort tagg"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder="Lägg till tagg"
        className="h-7 text-xs bg-white text-gray-900 border border-dashed border-gray-300 px-2 w-24 focus:outline-none focus:border-solid focus:border-gray-900 placeholder:text-gray-500"
      />
    </div>
  );
}
