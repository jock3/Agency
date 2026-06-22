"use client";

import { useState } from "react";
import MilouLogo from "@/components/MilouLogo";
import type { TodoList } from "@/lib/types";
import type { View } from "@/app/page";
import clsx from "clsx";

const LIST_COLORS = [
  "#E60330", "#C20028", "#931644", "#f97316", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface Props {
  view: View;
  onViewChange: (v: View) => void;
  lists: TodoList[];
  onAddList: (name: string, color: string) => void;
  completedCount: number;
}

export default function Sidebar({ view, onViewChange, lists, onAddList, completedCount }: Props) {
  const [addingList, setAddingList] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const handleAddList = () => {
    if (!newName.trim()) return;
    onAddList(newName.trim(), newColor);
    setNewName("");
    setNewColor("#3b82f6");
    setAddingList(false);
  };

  return (
    <aside className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="px-5 py-5 border-b border-gray-200">
        <MilouLogo className="h-5 w-auto text-gray-900" />
      </div>

      <nav className="px-2 py-3 space-y-0.5">
        <NavItem active={view === "today"} onClick={() => onViewChange("today")} icon={<CalendarIcon />} label="Idag" />
        <NavItem active={view === "all"} onClick={() => onViewChange("all")} icon={<ListIcon />} label="Alla uppgifter" />
        <NavItem
          active={view === "completed"}
          onClick={() => onViewChange("completed")}
          icon={<CheckIcon />}
          label={`Avklarade${completedCount > 0 ? ` (${completedCount})` : ""}`}
        />
      </nav>

      <div className="mx-4 border-t border-gray-200" />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        <div className="flex items-center justify-between px-2 py-1.5 mb-0.5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Listor</span>
          <button
            onClick={() => setAddingList(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded p-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="space-y-0.5">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => onViewChange(list.id)}
              className={clsx(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors text-left",
                view === list.id
                  ? "bg-gray-200 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: list.color }}
              />
              <span className="truncate">{list.name}</span>
            </button>
          ))}
        </div>

        {addingList && (
          <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddList();
                if (e.key === "Escape") { setAddingList(false); setNewName(""); }
              }}
              placeholder="Listnamn…"
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-milou-500 mb-2.5"
            />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {LIST_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={clsx(
                    "w-5 h-5 rounded-full transition-all",
                    newColor === c && "ring-2 ring-offset-1 ring-gray-400 scale-110"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleAddList}
                className="flex-1 text-xs bg-milou-500 text-white rounded-lg py-1.5 hover:bg-milou-600 transition-colors font-medium"
              >
                Skapa
              </button>
              <button
                onClick={() => { setAddingList(false); setNewName(""); }}
                className="flex-1 text-xs bg-gray-100 text-gray-600 rounded-lg py-1.5 hover:bg-gray-200 transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-200">
        <a href="/api/auth/logout" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Logga ut
        </a>
      </div>
    </aside>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors text-left",
        active
          ? "bg-milou-500 text-white font-medium"
          : "text-gray-600 hover:bg-gray-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
      <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
      <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
      <circle cx="3" cy="6" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
      <circle cx="3" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
