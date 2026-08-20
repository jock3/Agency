"use client";

import { Archive, ArchiveRestore, Inbox, Trash2, X } from "lucide-react";
import { fmtDate } from "@/lib/todo/utils";
import type { TodoList, TodoTask } from "@/lib/types";

interface Props {
  archived: TodoList[];
  tasksByList: Record<string, TodoTask[]>;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onClose: () => void;
}

export default function ArchivePanel({
  archived,
  tasksByList,
  onRestore,
  onDeleteForever,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Arkiv"
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <Archive size={17} />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Arkiv</h2>
            <p className="text-sm text-gray-500">Arkiverade grupper med innehåll.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-1.5 overflow-y-auto px-6 py-5">
          {archived.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
              <Inbox size={20} strokeWidth={1.5} /> Arkivet är tomt
            </div>
          )}
          {archived.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.color }} />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-gray-800">{l.name}</strong>
                <span className="text-xs text-gray-400">
                  {(tasksByList[l.id] ?? []).length} objekt
                  {l.archived_at && ` · arkiverad ${fmtDate(l.archived_at.slice(0, 10))}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRestore(l.id)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                <ArchiveRestore size={13} /> Återställ
              </button>
              <button
                type="button"
                onClick={() => onDeleteForever(l.id)}
                aria-label="Ta bort permanent"
                className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
