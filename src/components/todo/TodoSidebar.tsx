"use client";

import { useState } from "react";
import type { TodoList } from "@/lib/types";

const LIST_COLORS = ["#E60330", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

interface Props {
  lists: TodoList[];
  view: string;
  onViewChange: (v: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCreateList: (name: string, color: string) => void;
  onUpdateList: (id: string, updates: Partial<TodoList>) => void;
  onDeleteList: (id: string) => void;
  completedCount: number;
  todayCount: number;
}

export default function TodoSidebar({
  lists, view, onViewChange, collapsed, onToggleCollapse, onCreateList, onUpdateList, onDeleteList, completedCount, todayCount,
}: Props) {
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreateList = () => {
    if (newListName.trim()) onCreateList(newListName.trim(), newListColor);
    setNewListName("");
    setAddingList(false);
  };

  const startEditList = (list: TodoList) => {
    setEditingListId(list.id);
    setEditingName(list.name);
  };

  const commitEditList = (list: TodoList) => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== list.name) onUpdateList(list.id, { name: trimmed });
    setEditingListId(null);
  };

  const handleDeleteList = (list: TodoList) => {
    if (confirm(`Ta bort listan "${list.name}"? Uppgifterna flyttas till "Utan lista".`)) {
      onDeleteList(list.id);
    }
  };

  const navItems = [
    { id: "all",       label: "Alla uppgifter", icon: "▤",  badge: null },
    { id: "today",     label: "Idag",           icon: "◑",  badge: todayCount || null },
    { id: "completed", label: "Slutförda",       icon: "✓",  badge: completedCount || null },
  ];

  return (
    <aside
      className={`shrink-0 border-r border-gray-200 bg-white flex flex-col transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center px-3 py-3 border-b border-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        style={{ justifyContent: collapsed ? "center" : "flex-end" }}
      >
        <span className={`text-xs transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>◀</span>
      </button>

      {/* Nav items */}
      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-milou-50 text-milou-600 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base w-4 text-center shrink-0 leading-none">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge != null && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${active ? "bg-milou-100 text-milou-600" : "bg-gray-100 text-gray-500"}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Lists section */}
      {!collapsed ? (
        <>
          <div className="px-4 pt-4 pb-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Listor</span>
          </div>
          <div className="px-2 space-y-0.5 flex-1 overflow-y-auto">
            {lists.map((list) => {
              const active = view === list.id;
              const isEditing = editingListId === list.id;
              return (
                <div
                  key={list.id}
                  onClick={() => !isEditing && onViewChange(list.id)}
                  className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    active ? "bg-milou-50 text-milou-600 font-medium" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => commitEditList(list)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEditList(list);
                        if (e.key === "Escape") setEditingListId(null);
                      }}
                      className="flex-1 min-w-0 text-sm bg-transparent border-b border-milou-300 outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => { e.stopPropagation(); startEditList(list); }}
                      className="truncate text-left flex-1"
                    >
                      {list.name}
                    </span>
                  )}
                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditList(list); }}
                        title="Byt namn"
                        className="text-gray-300 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center rounded transition-colors"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list); }}
                        title="Ta bort lista"
                        className="text-gray-300 hover:text-red-400 text-base leading-none w-5 h-5 flex items-center justify-center rounded transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {addingList ? (
              <div className="px-3 py-2 space-y-2">
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateList();
                    if (e.key === "Escape") { setAddingList(false); setNewListName(""); }
                  }}
                  placeholder="Listnamn..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-milou-300"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {LIST_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewListColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full transition-transform ${newListColor === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateList}
                    className="text-xs bg-milou-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-milou-400 transition-colors"
                  >
                    Skapa
                  </button>
                  <button
                    onClick={() => { setAddingList(false); setNewListName(""); }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-milou-500 transition-colors"
              >
                <span className="text-base leading-none font-light w-4 text-center">+</span>
                Ny lista
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="px-2 space-y-1 flex-1 overflow-y-auto pt-2">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => onViewChange(list.id)}
              title={list.name}
              className={`w-full flex items-center justify-center py-2 rounded-lg transition-colors ${view === list.id ? "bg-milou-50" : "hover:bg-gray-50"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: list.color }} />
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
