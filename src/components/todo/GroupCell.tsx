"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import Popover, { PopLabel, PopItem } from "./Popover";
import type { TodoList } from "@/lib/types";

interface Props {
  listId: string | null;
  lists: TodoList[];
  onChange: (listId: string) => void;
}

/** Shows which group a task sits in; picking another one moves it. */
export default function GroupCell({ listId, lists, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const current = lists.find((l) => l.id === listId);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={"Grupp: " + (current ? current.name : "ingen") + " – byt för att flytta"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: current?.color ?? "#D1D5DB" }}
        />
        <span className="flex-1 truncate text-left">{current ? current.name : "–"}</span>
        <ChevronDown size={12} strokeWidth={2.5} className="shrink-0 text-gray-300" />
      </button>

      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={212}>
          <PopLabel>Flytta till grupp</PopLabel>
          {lists.map((l) => (
            <PopItem
              key={l.id}
              onClick={() => {
                if (l.id !== listId) onChange(l.id);
                setOpen(false);
              }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
              <span className="flex-1 truncate">{l.name}</span>
              {l.id === listId && <Check size={14} />}
            </PopItem>
          ))}
        </Popover>
      )}
    </>
  );
}
