"use client";

import { useState, useRef, useEffect } from "react";
import type { TodoTask, TodoList } from "@/lib/types";
import type { View } from "@/app/page";
import TaskItem from "@/components/TaskItem";

const COL = "grid-cols-[40px_minmax(0,1fr)_150px_110px_110px_40px]";

const VIEW_LABELS: Record<string, string> = {
  today: "Idag",
  all: "Alla uppgifter",
  completed: "Avklarade",
};

interface Group {
  id: string;
  name: string;
  color: string;
  tasks: TodoTask[];
}

interface Props {
  view: View;
  tasks: TodoTask[];
  lists: TodoList[];
  loading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onCreate: (title: string, listId?: string | null) => void;
  onUpdate: (id: string, updates: Partial<TodoTask>) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function TaskList({
  view, tasks, lists, loading, selectedTaskId, onSelectTask,
  onComplete, onDelete, onCreate, onUpdate, searchQuery, onSearchChange,
}: Props) {
  const isListView = view !== "today" && view !== "all" && view !== "completed";
  const currentList = isListView ? lists.find((l) => l.id === view) : null;
  const viewLabel = currentList ? currentList.name : (VIEW_LABELS[view] ?? "Uppgifter");
  const showAddTask = view !== "completed";

  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const firstGroupIdRef = useRef<string | null>(null);

  // Compute groups
  const groups: Group[] = [];
  if (isListView) {
    groups.push({ id: view, name: currentList?.name ?? "Lista", color: currentList?.color ?? "#E60330", tasks });
  } else {
    const byList: Record<string, TodoTask[]> = {};
    for (const task of tasks) {
      const key = task.list_id ?? "__inbox__";
      if (!byList[key]) byList[key] = [];
      byList[key].push(task);
    }
    if (byList["__inbox__"]?.length) {
      const inbox = lists.find((l) => l.name === "Inkorg");
      groups.push({ id: "__inbox__", name: "Inkorg", color: inbox?.color ?? "#E60330", tasks: byList["__inbox__"] });
    }
    for (const list of lists) {
      if (byList[list.id]?.length) {
        groups.push({ id: list.id, name: list.name, color: list.color, tasks: byList[list.id] });
      }
    }
  }

  firstGroupIdRef.current = groups[0]?.id ?? null;

  useEffect(() => {
    const handler = () => setAddingToGroup(firstGroupIdRef.current);
    document.addEventListener("todo:new-task", handler);
    return () => document.removeEventListener("todo:new-task", handler);
  }, []);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "klar").length;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#141414]">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-[#252525] shrink-0">
        <h1 className="text-xl font-semibold text-[#e5e5e5]">{viewLabel}</h1>
        {!loading && (
          <p className="text-xs text-[#555] mt-0.5">
            {totalTasks} objekt · {doneTasks} klara
          </p>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 mt-4 flex-wrap">
          {showAddTask && (
            <button
              onClick={() => setAddingToGroup(groups[0]?.id ?? "__new__")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-milou-500 hover:bg-milou-600 text-white text-xs font-medium rounded-lg transition-colors mr-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nytt objekt
            </button>
          )}

          {/* Search */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2d2d2d] hover:border-[#3d3d3d] transition-colors">
            <svg className="w-3 h-3 text-[#555] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Sök"
              className="bg-transparent outline-none text-[#e5e5e5] placeholder:text-[#555] w-24 text-xs"
            />
          </div>

          {["Filter", "Sortera"].map((label) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2d2d2d] hover:border-[#3d3d3d] text-xs text-[#666] hover:text-[#aaa] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-[#1c1c1c] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState view={view} />
        ) : (
          groups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              isAddingTask={addingToGroup === group.id}
              onOpenAdd={() => setAddingToGroup(group.id)}
              onCloseAdd={() => setAddingToGroup(null)}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              onComplete={onComplete}
              onDelete={onDelete}
              onCreate={onCreate}
              onUpdate={onUpdate}
              showAddTask={showAddTask}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface GroupSectionProps {
  group: Group;
  isAddingTask: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onCreate: (title: string, listId?: string | null) => void;
  onUpdate: (id: string, updates: Partial<TodoTask>) => void;
  showAddTask: boolean;
}

function GroupSection({
  group, isAddingTask, onOpenAdd, onCloseAdd,
  selectedTaskId, onSelectTask, onComplete, onDelete, onCreate, onUpdate, showAddTask,
}: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const listId = group.id === "__inbox__" ? null : group.id;
  const total = group.tasks.length;
  const done = group.tasks.filter((t) => t.status === "klar").length;
  const inProgress = group.tasks.filter((t) => t.status === "pagar").length;
  const cancelled = group.tasks.filter((t) => t.status === "avbruten").length;

  const submitAdd = () => {
    if (newTitle.trim()) onCreate(newTitle.trim(), listId);
    setNewTitle("");
    onCloseAdd();
  };

  return (
    <div className="rounded-xl border border-[#252525] overflow-hidden">
      {/* Group header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 bg-[#1c1c1c] select-none"
        style={{ borderLeft: `3px solid ${group.color}` }}
      >
        <button onClick={() => setCollapsed(!collapsed)} className="text-[#555] hover:text-[#888] transition-colors">
          <svg className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold" style={{ color: group.color }}>{group.name}</span>
        <span className="text-xs text-[#555]">{total} objekt</span>
      </div>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div className={`grid ${COL} px-1 py-1.5 bg-[#181818] border-b border-[#222]`}>
            <div />
            <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase pl-1">Objekt</div>
            <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase">Status</div>
            <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase">Prioritet</div>
            <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase">Datum</div>
            <div />
          </div>

          {/* Rows */}
          {group.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              colClass={COL}
              isSelected={selectedTaskId === task.id}
              onSelect={() => onSelectTask(task.id)}
              onComplete={(c) => onComplete(task.id, c)}
              onDelete={() => onDelete(task.id)}
              onUpdate={(updates) => onUpdate(task.id, updates)}
            />
          ))}

          {/* Add task row */}
          {showAddTask && (
            isAddingTask ? (
              <div className={`grid ${COL} border-b border-[#1e1e1e] bg-[#1c1c1c] px-1`}>
                <div className="flex items-center justify-center py-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-[#3d3d3d]" />
                </div>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAdd();
                    if (e.key === "Escape") { setNewTitle(""); onCloseAdd(); }
                  }}
                  onBlur={submitAdd}
                  placeholder="Ny uppgift…"
                  className="text-sm text-[#e5e5e5] bg-transparent outline-none placeholder:text-[#444] py-2.5"
                />
              </div>
            ) : (
              <button
                onClick={onOpenAdd}
                className="flex items-center gap-2 px-4 py-2 text-xs text-[#444] hover:text-[#777] border-b border-[#1e1e1e] w-full hover:bg-[#1c1c1c] transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Lägg till objekt
              </button>
            )
          )}

          {/* Footer: count + progress bar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#181818]">
            <span className="text-xs text-[#444]">{total} objekt</span>
            {total > 0 && (
              <div className="flex-1 h-1 rounded-full overflow-hidden bg-[#252525] flex">
                {done > 0 && <div style={{ width: `${(done / total) * 100}%`, backgroundColor: "#10b981" }} className="transition-all" />}
                {inProgress > 0 && <div style={{ width: `${(inProgress / total) * 100}%`, backgroundColor: "#f59e0b" }} className="transition-all" />}
                {cancelled > 0 && <div style={{ width: `${(cancelled / total) * 100}%`, backgroundColor: "#ef4444" }} className="transition-all" />}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ view }: { view: View }) {
  const msgs: Record<string, { emoji: string; title: string; sub: string }> = {
    today:     { emoji: "☀️", title: "Fri dag!",        sub: "Inga uppgifter förfaller idag." },
    all:       { emoji: "✓",  title: "Allt klart",      sub: "Lägg till ett nytt objekt ovan." },
    completed: { emoji: "🎉", title: "Inga avklarade",  sub: "Avklarade uppgifter dyker upp här." },
  };
  const msg = msgs[view] ?? { emoji: "📋", title: "Tom lista", sub: "Lägg till ett objekt nedan." };
  return (
    <div className="text-center py-16 select-none">
      <div className="text-4xl mb-3">{msg.emoji}</div>
      <p className="text-base font-medium text-[#888]">{msg.title}</p>
      <p className="text-sm text-[#555] mt-1">{msg.sub}</p>
    </div>
  );
}
