"use client";

import { ChevronDown, Copy, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import Popover, { PopItem } from "./Popover";
import { STATUSES } from "@/lib/todo/constants";
import type { TodoList, TodoStatus } from "@/lib/types";

interface Props {
  count: number;
  lists: TodoList[];
  onSetStatus: (status: TodoStatus) => void;
  onMoveTo: (listId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export default function BulkBar({
  count,
  lists,
  onSetStatus,
  onMoveTo,
  onDuplicate,
  onDelete,
  onClear,
}: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const statusRef = useRef<HTMLButtonElement>(null);
  const moveRef = useRef<HTMLButtonElement>(null);

  const btn =
    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/10";

  return (
    <div
      role="region"
      aria-label="Markerade objekt"
      className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-1.5 rounded-2xl bg-gray-900 px-3 py-2 shadow-2xl"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-milou-500 text-sm font-semibold text-white">
        {count}
      </span>
      <span className="pr-1 text-sm text-white/70">
        {count === 1 ? "objekt valt" : "objekt valda"}
      </span>

      <div className="mx-1 h-5 w-px bg-white/15" />

      <button ref={statusRef} type="button" onClick={() => setStatusOpen((v) => !v)} className={btn}>
        Status <ChevronDown size={12} />
      </button>
      {statusOpen && (
        <Popover anchorRef={statusRef} onClose={() => setStatusOpen(false)} width={176}>
          <div className="grid gap-1">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  onSetStatus(s.key);
                  setStatusOpen(false);
                }}
                style={{ background: s.color }}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                {s.label}
              </button>
            ))}
          </div>
        </Popover>
      )}

      <button ref={moveRef} type="button" onClick={() => setMoveOpen((v) => !v)} className={btn}>
        Flytta till <ChevronDown size={12} />
      </button>
      {moveOpen && (
        <Popover anchorRef={moveRef} onClose={() => setMoveOpen(false)} width={196}>
          {lists.map((l) => (
            <PopItem
              key={l.id}
              onClick={() => {
                onMoveTo(l.id);
                setMoveOpen(false);
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.name}
            </PopItem>
          ))}
        </Popover>
      )}

      <button type="button" onClick={onDuplicate} className={btn}>
        <Copy size={13} /> Duplicera
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20"
      >
        <Trash2 size={13} /> Ta bort
      </button>

      <div className="mx-1 h-5 w-px bg-white/15" />

      <button
        type="button"
        onClick={onClear}
        aria-label="Avmarkera alla"
        className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  );
}
