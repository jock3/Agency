"use client";

import {
  AlignLeft,
  Check,
  ListChecks,
  MessageSquare,
  Plus,
  Repeat,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import StatusPill from "./StatusPill";
import PriorityPill from "./PriorityPill";
import PersonCell from "./PersonCell";
import DateCell from "./DateCell";
import TimelineCell from "./TimelineCell";
import { REPEAT_LABEL } from "@/lib/todo/constants";
import { timeAgo } from "@/lib/todo/utils";
import type { UserOption } from "@/lib/api/todo";
import type { MutationEvent } from "./TaskRow";
import type { TodoList, TodoRepeat, TodoSubtask, TodoTask } from "@/lib/types";

interface Props {
  task: TodoTask;
  list: TodoList;
  users: UserOption[];
  subtasks: TodoSubtask[];
  currentUserName: string | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<TodoTask>, event?: MutationEvent) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (id: string, updates: Partial<TodoSubtask>) => void;
  onDeleteSubtask: (id: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
}

/** Slide-over with everything that does not fit in a row: notes, the checklist
 *  and the comment thread. */
export default function TaskDetail({
  task,
  list,
  users,
  subtasks,
  currentUserName,
  onClose,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onAddComment,
  onDeleteComment,
}: Props) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [comment, setComment] = useState("");
  const [subTitle, setSubTitle] = useState("");

  useEffect(() => {
    setNotes(task.notes ?? "");
  }, [task.id, task.notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commitNotes = () => {
    if (notes !== (task.notes ?? "")) onUpdate(task.id, { notes });
  };
  const close = () => {
    commitNotes();
    onClose();
  };

  const doneSubs = subtasks.filter((s) => s.status === "done").length;
  const comments = task.comments ?? [];

  const submitComment = () => {
    const t = comment.trim();
    if (!t) return;
    onAddComment(task.id, t);
    setComment("");
  };

  const submitSub = () => {
    const t = subTitle.trim();
    if (!t) return;
    onCreateSubtask(task.id, t);
    setSubTitle("");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/30" onClick={close}>
      <aside
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: list.color }} />
          <span className="flex-1 truncate text-sm font-medium text-gray-500">{list.name}</span>
          <button
            type="button"
            onClick={close}
            aria-label="Stäng"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <input
            value={task.title}
            placeholder="Namnlöst objekt"
            onChange={(e) => onUpdate(task.id, { title: e.target.value })}
            className="w-full border-none bg-transparent text-xl font-semibold text-gray-900 outline-none placeholder:text-gray-300"
          />

          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            <Prop label="Status">
              <StatusPill
                status={task.status}
                onChange={(v) => onUpdate(task.id, { status: v }, "status")}
              />
            </Prop>
            <Prop label="Prioritet">
              <PriorityPill
                priority={task.priority}
                onChange={(v) => onUpdate(task.id, { priority: v })}
              />
            </Prop>
            <Prop label="Person">
              <PersonCell
                userId={task.assigned_to}
                users={users}
                onChange={(v) => onUpdate(task.id, { assigned_to: v })}
              />
            </Prop>
            <Prop label="Datum">
              <DateCell
                value={task.due_date}
                onChange={(v) => onUpdate(task.id, { due_date: v }, "date")}
              />
            </Prop>
            <Prop label="Upprepa">
              <select
                value={task.repeat ?? ""}
                onChange={(e) =>
                  onUpdate(task.id, { repeat: (e.target.value || null) as TodoRepeat | null })
                }
                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-milou-300"
              >
                <option value="">Aldrig</option>
                {(Object.keys(REPEAT_LABEL) as TodoRepeat[]).map((r) => (
                  <option key={r} value={r}>
                    {REPEAT_LABEL[r]}
                  </option>
                ))}
              </select>
            </Prop>
            <Prop label="Tidslinje" wide>
              <TimelineCell
                start={task.start_date}
                end={task.end_date}
                color={list.color}
                onChange={(s, e) => onUpdate(task.id, { start_date: s, end_date: e })}
              />
            </Prop>
          </div>

          <Section icon={<AlignLeft size={14} />} title="Anteckningar">
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={commitNotes}
              placeholder="Skriv beskrivning, länkar, kontext…"
              className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-milou-300"
            />
          </Section>

          <Section
            icon={<ListChecks size={14} />}
            title="Checklista"
            count={subtasks.length ? `${doneSubs}/${subtasks.length}` : undefined}
          >
            <div className="space-y-1">
              {subtasks.map((sub) => (
                <div key={sub.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Växla klar"
                    onClick={() =>
                      onUpdateSubtask(sub.id, {
                        status: sub.status === "done" ? "todo" : "done",
                        completed: sub.status !== "done",
                      })
                    }
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      sub.status === "done"
                        ? "border-milou-500 bg-milou-500 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {sub.status === "done" && <Check size={11} strokeWidth={3} />}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      sub.status === "done" ? "text-gray-400 line-through" : "text-gray-700"
                    }`}
                  >
                    {sub.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteSubtask(sub.id)}
                    aria-label="Ta bort"
                    className="rounded p-1 text-gray-300 opacity-0 transition-colors hover:text-red-500 group-hover:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 text-gray-300">
                <Plus size={14} />
                <input
                  value={subTitle}
                  placeholder="Lägg till punkt"
                  onChange={(e) => setSubTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSub();
                  }}
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
                />
              </div>
            </div>
          </Section>

          <Section
            icon={<MessageSquare size={14} />}
            title="Kommentarer"
            count={comments.length ? String(comments.length) : undefined}
          >
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="group flex gap-2.5">
                  <Avatar name={c.author} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <strong className="text-gray-800">{c.author}</strong>
                      <span className="text-gray-400">{timeAgo(c.at)}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteComment(task.id, c.id)}
                        aria-label="Ta bort kommentar"
                        className="ml-auto rounded p-0.5 text-gray-300 opacity-0 transition-colors hover:text-red-500 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">{c.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-gray-400">Inga kommentarer än.</p>
              )}
            </div>

            <div className="mt-3 flex items-end gap-2">
              <Avatar name={currentUserName} size={28} />
              <textarea
                rows={1}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
                }}
                placeholder="Skriv en kommentar…  (⌘↵ skickar)"
                className="flex-1 resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-milou-300"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={!comment.trim()}
                aria-label="Skicka"
                className="rounded-xl bg-milou-500 p-2 text-white transition-colors hover:bg-milou-400 disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
          </Section>

          <div className="mt-8 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={13} /> Ta bort objekt
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Prop({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </label>
      <div className="relative flex items-center">{children}</div>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {icon}
        {title}
        {count && (
          <span className="rounded-full bg-gray-100 px-1.5 text-[11px] font-medium text-gray-500">
            {count}
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}
