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
          className="flex items-center gap-1 text-xs bg-[#2B2B2B] text-gray-200 border border-[#3a3a3a] rounded-full pl-2 pr-1 py-0.5"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="text-gray-500 hover:text-white leading-none"
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
        placeholder="+ Tagg"
        className="text-xs bg-[#2B2B2B] text-gray-200 border border-[#3a3a3a] rounded-full px-2 py-0.5 w-20 focus:outline-none focus:border-milou-500 placeholder:text-gray-500"
      />
    </div>
  );
}
