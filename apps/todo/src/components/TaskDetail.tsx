"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import type { TodoTask, TodoList, TodoSubtask } from "@/lib/types";
import { createSubtask, updateSubtask, deleteSubtask } from "@/lib/api/subtasks";

interface Props {
  task: TodoTask;
  subtasks: TodoSubtask[];
  lists: TodoList[];
  onUpdate: (taskId: string, updates: Partial<TodoTask>) => void;
  onClose: () => void;
  onDelete: () => void;
  onSubtasksChange: () => void;
}

const PRIORITIES: { value: TodoTask["priority"]; label: string }[] = [
  { value: "none", label: "Ingen" },
  { value: "low", label: "Låg" },
  { value: "medium", label: "Medel" },
  { value: "high", label: "Hög" },
];

export default function TaskDetail({ task, subtasks, lists, onUpdate, onClose, onDelete, onSubtasksChange }: Props) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [newSubtask, setNewSubtask] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes ?? "");
  }, [task.id]);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed });
    } else {
      setTitle(task.title);
    }
  };

  const saveNotes = () => {
    const val = notes.trim() || null;
    if (val !== task.notes) {
      onUpdate(task.id, { notes: val });
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await createSubtask(task.id, newSubtask.trim());
    setNewSubtask("");
    onSubtasksChange();
  };

  const handleToggleSubtask = async (sub: TodoSubtask) => {
    await updateSubtask(sub.id, { completed: !sub.completed });
    onSubtasksChange();
  };

  const handleDeleteSubtask = async (id: string) => {
    await deleteSubtask(id);
    onSubtasksChange();
  };

  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <aside className="w-80 border-l border-gray-200 bg-white flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detaljer</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors rounded-md p-0.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-5">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="w-full text-base font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
        />

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Anteckningar</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Lägg till anteckningar…"
            rows={3}
            className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-milou-500 resize-none scrollbar-thin"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Prioritet</label>
          <div className="flex gap-1.5 flex-wrap">
            {PRIORITIES.map(({ value, label }) => {
              const active = task.priority === value;
              return (
                <button
                  key={value}
                  onClick={() => onUpdate(task.id, { priority: value })}
                  className={clsx(
                    "text-xs px-3 py-1.5 rounded-lg font-medium transition-all border",
                    active
                      ? value === "high"
                        ? "bg-milou-500 text-white border-milou-500"
                        : value === "medium"
                          ? "bg-amber-500 text-white border-amber-500"
                          : value === "low"
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Förfallodatum</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-milou-500 text-gray-700"
            />
            {task.due_date && (
              <button
                onClick={() => onUpdate(task.id, { due_date: null })}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Rensa
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Lista</label>
          <select
            value={task.list_id ?? ""}
            onChange={(e) => onUpdate(task.id, { list_id: e.target.value || null })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-milou-500 text-gray-700 bg-white"
          >
            <option value="">Ingen lista</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-400">
              Deluppgifter
              {subtasks.length > 0 && (
                <span className="ml-1 text-gray-300">{completedSubtasks}/{subtasks.length}</span>
              )}
            </label>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-1 mb-2">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group py-0.5">
                  <button
                    onClick={() => handleToggleSubtask(sub)}
                    className={clsx(
                      "w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all",
                      sub.completed
                        ? "bg-milou-500 border-milou-500"
                        : "border-gray-300 hover:border-milou-400"
                    )}
                  >
                    {sub.completed && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span className={clsx("text-sm flex-1", sub.completed && "line-through text-gray-400")}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubtask();
                if (e.key === "Escape") setNewSubtask("");
              }}
              placeholder="Lägg till deluppgift…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-milou-500 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={onDelete}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Ta bort uppgift
        </button>
        {task.completed_at && (
          <span className="text-xs text-gray-400">
            Avklarad
          </span>
        )}
      </div>
    </aside>
  );
}
