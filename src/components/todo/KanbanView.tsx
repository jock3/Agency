"use client";

import { Flag, ListTree, MessageSquare } from "lucide-react";
import { useState, type DragEvent } from "react";
import Avatar from "./Avatar";
import DoneCheck from "./DoneCheck";
import { PRIORITY_MAP, STATUSES } from "@/lib/todo/constants";
import { dueLabel } from "@/lib/todo/quickadd";
import { isOverdue } from "@/lib/todo/utils";
import type { UserOption } from "@/lib/api/todo";
import type { TodoList, TodoStatus, TodoSubtask, TodoTask } from "@/lib/types";
import type { MutationEvent } from "./TaskRow";

// Arbetsflödets ordning, inte konstantlistans: från ej påbörjad till klart.
const FLOW: TodoStatus[] = ["todo", "working", "review", "stuck", "done"];

interface Props {
  lists: TodoList[];
  tasks: TodoTask[];
  users: UserOption[];
  subtasksByTask: Record<string, TodoSubtask[]>;
  onUpdateTask: (id: string, updates: Partial<TodoTask>, event?: MutationEvent) => void;
  onOpen: (id: string) => void;
}

/** Tavla per status. Dra ett kort till en annan kolumn för att byta status. */
export default function KanbanView({ lists, tasks, users, subtasksByTask, onUpdateTask, onOpen }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TodoStatus | null>(null);
  const listById = Object.fromEntries(lists.map((l) => [l.id, l]));
  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? null;

  const drop = (status: TodoStatus) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) onUpdateTask(task.id, { status }, "status");
    setDragId(null);
    setOver(null);
  };

  return (
    <div className="grid min-h-full auto-cols-[minmax(216px,1fr)] grid-flow-col gap-4 overflow-x-auto px-6 pb-24 pt-5">
      {FLOW.map((key) => {
        const cfg = STATUSES.find((s) => s.key === key)!;
        const cards = tasks.filter((t) => t.status === key && t.list_id && listById[t.list_id]);
        const isOver = over === key && dragId !== null;
        return (
          <section
            key={key}
            aria-label={cfg.label}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              if (over !== key) setOver(key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
            }}
            onDrop={drop(key)}
            className={`flex flex-col transition-colors ${isOver ? "bg-white" : ""}`}
            style={isOver ? { boxShadow: `inset 0 0 0 2px ${cfg.color}` } : undefined}
          >
            <header className="flex items-center gap-2 border-b-[3px] px-1 pb-2.5" style={{ borderColor: cfg.color }}>
              <span className="font-display font-bold text-gray-900">{cfg.label}</span>
              <span className="text-sm text-gray-400 tabular-nums">{cards.length}</span>
            </header>

            <ul className="flex flex-1 flex-col gap-2 py-3">
              {cards.map((t) => {
                const list = listById[t.list_id!];
                const subs = subtasksByTask[t.id] ?? [];
                const subsDone = subs.filter((s) => s.status === "done").length;
                const overdue = isOverdue(t);
                const done = t.status === "done";
                const person = userName(t.assigned_to);
                return (
                  <li
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(t.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                    className={`group relative cursor-grab bg-white pl-4 pr-3 py-3 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] ring-1 ring-gray-100 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[-6px_6px_0_0_#FFDED0] active:cursor-grabbing ${
                      dragId === t.id ? "opacity-40" : ""
                    }`}
                  >
                    <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: list.color }} aria-hidden />
                    <div className="flex items-start gap-2.5">
                      <DoneCheck
                        done={done}
                        onToggle={() => onUpdateTask(t.id, { status: done ? "todo" : "done" }, "status")}
                        label={`Bocka av ${t.title}`}
                        size={18}
                      />
                      <button
                        type="button"
                        onClick={() => onOpen(t.id)}
                        className={`min-w-0 flex-1 text-left text-sm leading-snug ${done ? "text-gray-400 line-through" : "text-gray-900"}`}
                      >
                        {t.title}
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5 whitespace-nowrap pl-[28px] text-xs text-gray-500">
                      <span className="min-w-0 flex-1 truncate">{list.name}</span>
                      {t.priority !== "none" && t.priority !== "low" && (
                        <Flag size={12} strokeWidth={2.5} style={{ color: PRIORITY_MAP[t.priority].color }} aria-label={`Prioritet ${PRIORITY_MAP[t.priority].label}`} />
                      )}
                      {subs.length > 0 && (
                        <span className="flex items-center gap-1 tabular-nums">
                          <ListTree size={12} /> {subsDone}/{subs.length}
                        </span>
                      )}
                      {t.comments.length > 0 && (
                        <span className="flex items-center gap-1 tabular-nums">
                          <MessageSquare size={12} /> {t.comments.length}
                        </span>
                      )}
                      {t.due_date && !done && (
                        <span className={overdue ? "font-bold text-milou-500" : ""}>{dueLabel(t.due_date)}</span>
                      )}
                      {person && <Avatar name={person} size={20} />}
                    </div>
                  </li>
                );
              })}
              {cards.length === 0 && (
                <li className="border-2 border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
                  {dragId ? "Släpp här" : "Inget här"}
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
