"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Palette,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import Popover, { PopItem, PopSeparator } from "./Popover";
import EditInput from "./EditInput";
import DistBar from "./DistBar";
import { GROUP_COLORS } from "@/lib/todo/constants";
import type { TodoList, TodoTask } from "@/lib/types";

interface Props {
  list: TodoList;
  index: number;
  total: number;
  tasks: TodoTask[];
  onUpdateList: (id: string, updates: Partial<TodoList>) => void;
  onMoveGroup: (id: string, dir: -1 | 1) => void;
  onArchiveGroup: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onMarkAllDone: (id: string) => void;
}

export default function GroupHeader({
  list,
  index,
  total,
  tasks,
  onUpdateList,
  onMoveGroup,
  onArchiveGroup,
  onDeleteGroup,
  onMarkAllDone,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  const done = tasks.filter((t) => t.status === "done").length;
  const allDone = tasks.length > 0 && done === tasks.length;

  return (
    <div className="flex items-center gap-2 py-2">
      <button
        type="button"
        onClick={() => onUpdateList(list.id, { collapsed: !list.collapsed })}
        aria-label={list.collapsed ? "Fäll ut grupp" : "Fäll ihop grupp"}
        aria-expanded={!list.collapsed}
        className="rounded p-0.5 transition-colors hover:bg-gray-200"
        style={{ color: list.color }}
      >
        {list.collapsed ? (
          <ChevronRight size={17} strokeWidth={2.5} />
        ) : (
          <ChevronDown size={17} strokeWidth={2.5} />
        )}
      </button>

      {editing ? (
        <EditInput
          value={list.name}
          className="text-base font-semibold"
          onCancel={() => setEditing(false)}
          onCommit={(v) => {
            if (v) onUpdateList(list.id, { name: v });
            setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Byt namn"
          className="text-base font-semibold hover:underline"
          style={{ color: list.color }}
        >
          {list.name}
        </button>
      )}

      <span className="text-xs text-gray-400">
        {tasks.length} objekt{done > 0 ? ` · ${done} klara` : ""}
      </span>

      {allDone && (
        <span
          className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"
          aria-label="Alla objekt klara"
        >
          Klart!
        </span>
      )}

      {list.collapsed && tasks.length > 0 && (
        <div className="w-40">
          <DistBar tasks={tasks} />
        </div>
      )}

      <span className="flex-1" />

      <button
        ref={menuRef}
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Gruppmeny"
        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
      >
        <MoreHorizontal size={16} />
      </button>

      {menuOpen && (
        <Popover
          anchorRef={menuRef}
          onClose={() => {
            setMenuOpen(false);
            setColorOpen(false);
          }}
          width={216}
          align="right"
        >
          <PopItem
            onClick={() => {
              setEditing(true);
              setMenuOpen(false);
            }}
          >
            <Pencil size={13} /> Byt namn
          </PopItem>
          <PopItem onClick={() => setColorOpen((v) => !v)}>
            <Palette size={13} /> Byt färg
            <ChevronRight
              size={12}
              className={`ml-auto transition-transform ${colorOpen ? "rotate-90" : ""}`}
            />
          </PopItem>
          {colorOpen && (
            <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={"Färg " + c}
                  style={{ background: c }}
                  onClick={() => {
                    onUpdateList(list.id, { color: c });
                    setMenuOpen(false);
                    setColorOpen(false);
                  }}
                  className={`h-5 w-5 rounded-full transition-transform ${
                    c === list.color ? "scale-110 ring-2 ring-gray-400 ring-offset-1" : ""
                  }`}
                />
              ))}
            </div>
          )}
          <PopSeparator />
          <PopItem disabled={index === 0} onClick={() => { onMoveGroup(list.id, -1); setMenuOpen(false); }}>
            <ArrowUp size={13} /> Flytta upp
          </PopItem>
          <PopItem
            disabled={index === total - 1}
            onClick={() => {
              onMoveGroup(list.id, 1);
              setMenuOpen(false);
            }}
          >
            <ArrowDown size={13} /> Flytta ned
          </PopItem>
          <PopSeparator />
          <PopItem
            disabled={tasks.length === 0 || allDone}
            onClick={() => {
              onMarkAllDone(list.id);
              setMenuOpen(false);
            }}
          >
            <Check size={13} /> Markera allt som Klart
          </PopItem>
          <PopItem
            onClick={() => {
              onArchiveGroup(list.id);
              setMenuOpen(false);
            }}
          >
            <Archive size={13} /> Arkivera grupp
          </PopItem>
          <PopItem
            danger
            onClick={() => {
              onDeleteGroup(list.id);
              setMenuOpen(false);
            }}
          >
            <Trash2 size={13} /> Ta bort grupp
          </PopItem>
        </Popover>
      )}
    </div>
  );
}
