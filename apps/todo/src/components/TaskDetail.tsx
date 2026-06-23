"use client";

import { useState, useEffect } from "react";
import type { TodoTask, TodoList, TodoSubtask, TodoStatus } from "@/lib/types";
import { createSubtask, updateSubtask, deleteSubtask } from "@/lib/api/subtasks";
import { STATUS_CONFIG, STATUS_CYCLE } from "@/components/StatusBadge";

interface Props {
  task: TodoTask;
  subtasks: TodoSubtask[];
  lists: TodoList[];
  onUpdate: (taskId: string, updates: Partial<TodoTask>) => void;
  onClose: () => void;
  onDelete: () => void;
  onSubtasksChange: () => void;
}

const PRIORITIES: { value: TodoTask["priority"]; label: string; color: string }[] = [
  { value: "none",   label: "Ingen", color: "#555" },
  { value: "low",    label: "Låg",   color: "#60a5fa" },
  { value: "medium", label: "Medel", color: "#f59e0b" },
  { value: "high",   label: "Hög",   color: "#f87171" },
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
    if (trimmed && trimmed !== task.title) onUpdate(task.id, { title: trimmed });
    else setTitle(task.title);
  };

  const saveNotes = () => {
    const val = notes.trim() || null;
    if (val !== task.notes) onUpdate(task.id, { notes: val });
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await createSubtask(task.id, newSubtask.trim());
    setNewSubtask("");
    onSubtasksChange();
  };

  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <aside className="w-80 border-l border-[#252525] bg-[#1a1a1a] flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#252525]">
        <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">Detaljer</span>
        <button onClick={onClose} className="text-[#444] hover:text-[#888] transition-colors rounded-md p-0.5">
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
          className="w-full text-base font-semibold text-[#e5e5e5] bg-transparent border-none outline-none focus:ring-0 p-0"
        />

        {/* Status */}
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-2">Status</label>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_CYCLE.map((value) => {
              const cfg = STATUS_CONFIG[value];
              const active = task.status === value;
              return (
                <button
                  key={value}
                  onClick={() => onUpdate(task.id, { status: value as TodoStatus })}
                  style={active ? { backgroundColor: cfg.bg, color: cfg.color } : {}}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                    active ? "border-transparent" : "bg-transparent text-[#555] border-[#2d2d2d] hover:border-[#3d3d3d] hover:text-[#888]"
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-2">Prioritet</label>
          <div className="flex gap-1.5 flex-wrap">
            {PRIORITIES.map(({ value, label, color }) => {
              const active = task.priority === value;
              return (
                <button
                  key={value}
                  onClick={() => onUpdate(task.id, { priority: value })}
                  style={active ? { backgroundColor: color + "22", color, borderColor: color + "44" } : {}}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                    active ? "" : "bg-transparent text-[#555] border-[#2d2d2d] hover:border-[#3d3d3d] hover:text-[#888]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Förfallodatum</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
              className="text-sm border border-[#2d2d2d] bg-[#252525] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-milou-500 text-[#e5e5e5] [color-scheme:dark]"
            />
            {task.due_date && (
              <button onClick={() => onUpdate(task.id, { due_date: null })} className="text-xs text-[#555] hover:text-[#888] transition-colors">
                Rensa
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Lista</label>
          <select
            value={task.list_id ?? ""}
            onChange={(e) => onUpdate(task.id, { list_id: e.target.value || null })}
            className="w-full text-sm border border-[#2d2d2d] bg-[#252525] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-milou-500 text-[#e5e5e5]"
          >
            <option value="">Ingen lista</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Anteckningar</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Lägg till anteckningar…"
            rows={3}
            className="w-full text-sm text-[#d4d4d4] bg-[#252525] rounded-xl px-3 py-2.5 border border-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-milou-500 resize-none scrollbar-thin placeholder:text-[#444]"
          />
        </div>

        {/* Subtasks */}
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-2">
            Deluppgifter
            {subtasks.length > 0 && <span className="ml-1 text-[#444]">{completedSubtasks}/{subtasks.length}</span>}
          </label>

          {subtasks.length > 0 && (
            <div className="space-y-1 mb-2">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group py-0.5">
                  <button
                    onClick={async () => { await updateSubtask(sub.id, { completed: !sub.completed }); onSubtasksChange(); }}
                    className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                      sub.completed ? "bg-milou-500 border-milou-500" : "border-[#3d3d3d] hover:border-milou-400"
                    }`}
                  >
                    {sub.completed && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${sub.completed ? "line-through text-[#555]" : "text-[#d4d4d4]"}`}>
                    {sub.title}
                  </span>
                  <button
                    onClick={async () => { await deleteSubtask(sub.id); onSubtasksChange(); }}
                    className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-red-400 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
              if (e.key === "Escape") setNewSubtask("");
            }}
            placeholder="Lägg till deluppgift…"
            className="w-full text-sm border border-[#2d2d2d] bg-[#252525] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-milou-500 placeholder:text-[#444] text-[#e5e5e5]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#252525] flex items-center justify-between">
        <button onClick={onDelete} className="text-xs text-[#555] hover:text-red-400 transition-colors">
          Ta bort uppgift
        </button>
        {task.completed_at && <span className="text-xs text-[#444]">Avklarad</span>}
      </div>
    </aside>
  );
}
