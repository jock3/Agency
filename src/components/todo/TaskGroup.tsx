"use client";

import { useState } from "react";
import type { TodoList, TodoTask, TodoSubtask } from "@/lib/types";
import TaskRow from "./TaskRow";

interface Props {
  list: TodoList | null;
  tasks: TodoTask[];
  selectedTaskId: string | null;
  subtasksByTask: Record<string, TodoSubtask[]>;
  onSelectTask: (id: string) => void;
  onCreateTask: (listId: string | null, title: string) => void;
  onUpdateTask: (id: string, updates: Partial<TodoTask>) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtask: (id: string) => void;
  disableAdd?: boolean;
}

export default function TaskGroup({
  list, tasks, selectedTaskId, subtasksByTask, onSelectTask, onCreateTask, onUpdateTask, onDeleteTask, onToggleSubtask, disableAdd,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const color = list?.color ?? "#94A3B8";
  const completedCount = tasks.filter((t) => t.completed).length;

  const handleAddTask = () => {
    if (newTitle.trim()) onCreateTask(list?.id ?? null, newTitle.trim());
    setNewTitle("");
    setAddingTask(false);
  };

  return (
    <div className="mb-8">
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-2.5 sticky top-0 bg-gray-50 z-10 border-b border-gray-100">
        <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2"
        >
          <span className={`text-gray-400 text-xs transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`}>
            ▶
          </span>
          <span className="text-sm font-semibold text-gray-700">{list?.name ?? "Utan lista"}</span>
        </button>
        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
        {completedCount > 0 && (
          <span className="text-xs text-gray-300">· {completedCount} klar</span>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[32px_minmax(0,1fr)_140px_100px_120px_120px_32px] items-center gap-2 px-4 py-1.5 border-b border-gray-100 bg-gray-50/50">
            <div />
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Uppgift</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Prioritet</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Deadline</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Klar</div>
            <div />
          </div>

          {/* Rows */}
          {tasks.length === 0 && !addingTask && (
            <div className="px-4 py-3 text-xs text-gray-300 italic">Inga uppgifter</div>
          )}
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              subtasks={subtasksByTask[task.id] ?? []}
              selected={selectedTaskId === task.id}
              onSelect={() => onSelectTask(task.id)}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onToggleSubtask={onToggleSubtask}
            />
          ))}

          {/* Inline add */}
          {!disableAdd && (
            addingTask ? (
              <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2 px-4 py-2 border-b border-gray-100">
                <div />
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={handleAddTask}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTask();
                    if (e.key === "Escape") { setAddingTask(false); setNewTitle(""); }
                  }}
                  placeholder="Uppgiftsnamn..."
                  className="text-sm outline-none bg-transparent border-b border-milou-300 py-0.5 placeholder-gray-300"
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-gray-400 hover:text-milou-500 transition-colors"
              >
                <span className="text-base leading-none font-light">+</span>
                Lägg till uppgift
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}
