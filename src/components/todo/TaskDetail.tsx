"use client";

import { useState, useEffect } from "react";
import type { TodoList, TodoTask, TodoSubtask, TodoStatus, TodoPriority } from "@/lib/types";
import { type UserOption } from "@/lib/api/todo";
import { STATUS_CONFIG } from "./StatusPill";
import { PRIORITY_CONFIG } from "./PriorityPill";

interface Props {
  task: TodoTask;
  lists: TodoList[];
  users: UserOption[];
  subtasks: TodoSubtask[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<TodoTask>) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
}

export default function TaskDetail({ task, lists, users, subtasks, onClose, onUpdate, onDelete, onCreateSubtask, onToggleSubtask, onDeleteSubtask }: Props) {
  const [newSubtask, setNewSubtask] = useState("");
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes ?? "");
  }, [task.id, task.title, task.notes]);

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    onCreateSubtask(task.id, newSubtask.trim());
    setNewSubtask("");
  };

  const doneCount = subtasks.filter((s) => s.completed).length;

  return (
    <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detaljer</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors">
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title */}
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title.trim() !== task.title) onUpdate(task.id, { title: title.trim() }); }}
          className="w-full text-base font-semibold text-gray-900 resize-none border-0 outline-none bg-transparent leading-snug"
          rows={2}
        />

        {/* Status */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Status</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(STATUS_CONFIG) as [TodoStatus, (typeof STATUS_CONFIG)[TodoStatus]][]).map(([key, c]) => (
              <button
                key={key}
                onClick={() => onUpdate(task.id, { status: key })}
                style={task.status === key ? { backgroundColor: c.bg, color: c.text } : undefined}
                className={`text-xs px-2 py-2 rounded-lg font-medium text-center transition-all border ${
                  task.status === key ? "border-transparent" : "border-gray-100 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Prioritet</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(PRIORITY_CONFIG) as [TodoPriority, (typeof PRIORITY_CONFIG)[TodoPriority]][]).map(([key, c]) => (
              <button
                key={key}
                onClick={() => onUpdate(task.id, { priority: key })}
                style={task.priority === key ? { backgroundColor: c.bg, color: c.text } : undefined}
                className={`text-xs px-2 py-2 rounded-lg font-medium text-center transition-all border ${
                  task.priority === key ? "border-transparent" : "border-gray-100 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deadline + Klar */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Deadline</label>
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => onUpdate(task.id, { due_date: e.target.value || null })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full outline-none focus:border-milou-300 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Klar</label>
            <div className="text-sm border border-gray-100 rounded-lg px-3 py-2 w-full bg-gray-50 text-gray-500">
              {task.completed_at
                ? new Date(task.completed_at).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" })
                : "—"}
            </div>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Tilldelad</label>
          <select
            value={task.assigned_to ?? ""}
            onChange={(e) => onUpdate(task.id, { assigned_to: e.target.value || null })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full outline-none focus:border-milou-300 transition-colors bg-white"
          >
            <option value="">Ingen</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* List */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Lista</label>
          <select
            value={task.list_id ?? ""}
            onChange={(e) => onUpdate(task.id, { list_id: e.target.value || null })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full outline-none focus:border-milou-300 transition-colors bg-white"
          >
            <option value="">Ingen lista</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Anteckningar</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (task.notes ?? "")) onUpdate(task.id, { notes: notes || null }); }}
            placeholder="Lägg till anteckningar..."
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-milou-300 resize-none text-gray-700 placeholder-gray-300 transition-colors"
          />
        </div>

        {/* Subtasks */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Deluppgifter {subtasks.length > 0 && <span className="normal-case font-normal">({doneCount}/{subtasks.length})</span>}
          </label>

          {subtasks.length > 0 && (
            <div className="mb-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all"
                style={{ width: `${(doneCount / subtasks.length) * 100}%` }}
              />
            </div>
          )}

          <div className="space-y-1.5 mb-2">
            {subtasks.map((st) => (
              <div key={st.id} className="group/st flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={st.completed}
                  onChange={() => onToggleSubtask(st.id)}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-milou-500"
                />
                <span className={`flex-1 text-sm ${st.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                  {st.title}
                </span>
                <button
                  onClick={() => onDeleteSubtask(st.id)}
                  className="opacity-0 group-hover/st:opacity-100 text-gray-300 hover:text-red-400 text-sm transition-all"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
              placeholder="Lägg till deluppgift..."
              className="flex-1 text-sm border border-gray-100 rounded-lg px-2.5 py-1.5 outline-none focus:border-milou-300 placeholder-gray-300 transition-colors"
            />
            <button
              onClick={handleAddSubtask}
              className="text-sm text-milou-500 font-medium hover:text-milou-400 px-1 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          onClick={() => { if (confirm("Ta bort uppgiften?")) onDelete(task.id); }}
          className="w-full text-sm text-red-400 hover:text-red-600 transition-colors py-1"
        >
          Ta bort uppgift
        </button>
      </div>
    </aside>
  );
}
