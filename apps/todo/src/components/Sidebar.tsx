"use client";

import { useState } from "react";
import type { TodoList } from "@/lib/types";
import MilouLogo from "@/components/MilouLogo";
import type { View } from "@/app/page";

interface Props {
  view: View;
  onViewChange: (v: View) => void;
  lists: TodoList[];
  onAddList: (name: string, color: string) => void;
  completedCount: number;
}

const COLORS = [
  "#E60330", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export default function Sidebar({ view, onViewChange, lists, onAddList, completedCount }: Props) {
  const [addingList, setAddingList] = useState(false);
  const [listName, setListName] = useState("");
  const [listColor, setListColor] = useState(COLORS[0]);

  const submit = () => {
    if (listName.trim()) {
      onAddList(listName.trim(), listColor);
      setListName("");
      setListColor(COLORS[0]);
      setAddingList(false);
    }
  };

  return (
    <aside className="w-16 bg-[#1a1a1a] flex flex-col items-center py-3 shrink-0 border-r border-[#252525] overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="mb-5">
        <div className="w-9 h-9 rounded-xl bg-milou-500 flex items-center justify-center">
          <MilouLogo className="h-4 w-auto text-white" />
        </div>
      </div>

      {/* Fixed views */}
      <div className="w-full flex flex-col items-center gap-0.5">
        <NavItem icon={<CalendarIcon />} label="Idag"  active={view === "today"}     onClick={() => onViewChange("today")} />
        <NavItem icon={<GridIcon />}     label="Alla"  active={view === "all"}       onClick={() => onViewChange("all")} />
        <NavItem
          icon={<CheckCircleIcon />}
          label="Klara"
          active={view === "completed"}
          badge={completedCount > 0 ? completedCount : undefined}
          onClick={() => onViewChange("completed")}
        />

        {lists.length > 0 && <div className="w-8 border-t border-[#252525] my-2" />}

        {/* Lists as colored letter badges */}
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => onViewChange(list.id)}
            title={list.name}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all mb-0.5 ${
              view === list.id ? "ring-2 ring-white/20 scale-105" : "hover:scale-105 hover:opacity-90"
            }`}
            style={{ backgroundColor: list.color + "28", color: list.color }}
          >
            {list.name.slice(0, 2).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Bottom: add list + logout */}
      <div className="mt-auto w-full flex flex-col items-center pt-2 border-t border-[#252525]">
        {addingList ? (
          <div className="w-full px-2 py-2 flex flex-col gap-1.5">
            <input
              autoFocus
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") { setListName(""); setAddingList(false); }
              }}
              placeholder="Namn…"
              className="w-full text-xs bg-[#252525] border border-[#3d3d3d] rounded-lg px-2 py-1 text-[#e5e5e5] outline-none focus:border-milou-500 placeholder:text-[#444]"
            />
            <div className="flex flex-wrap gap-1 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setListColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform ${listColor === c ? "ring-2 ring-white/50 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button onClick={submit} className="text-xs bg-milou-500 hover:bg-milou-600 text-white rounded-lg py-1 transition-colors font-medium">
              Ok
            </button>
            <button onClick={() => { setListName(""); setAddingList(false); }} className="text-xs text-[#555] hover:text-[#888] text-center transition-colors">
              Avbryt
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingList(true)}
            title="Ny lista"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#444] hover:text-[#888] hover:bg-[#252525] transition-all mb-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        <a
          href="/api/auth/logout"
          title="Logga ut"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#444] hover:text-[#888] hover:bg-[#252525] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </a>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex flex-col items-center gap-0.5 py-1.5 transition-colors ${
        active ? "text-milou-400" : "text-[#444] hover:text-[#888]"
      }`}
    >
      <div className={`w-9 h-8 rounded-lg flex items-center justify-center transition-colors ${
        active ? "bg-milou-500/20" : "hover:bg-[#252525]"
      }`}>
        {icon}
      </div>
      <span className="text-[9px] leading-none tracking-wide">{label}</span>
      {badge !== undefined && (
        <span className="absolute top-1 right-2 min-w-[16px] h-4 bg-milou-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
