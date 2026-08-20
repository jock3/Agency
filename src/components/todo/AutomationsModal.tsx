"use client";

import { ChevronDown, X, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { STATUSES, STATUS_MAP } from "@/lib/todo/constants";
import type { Automation, AutomationType, TodoList, TodoStatus } from "@/lib/types";

interface Props {
  automations: Automation[];
  lists: TodoList[];
  onChange: (next: Automation[]) => void;
  onClose: () => void;
}

export default function AutomationsModal({ automations, lists, onChange, onClose }: Props) {
  const update = (id: string, patch: Partial<Automation>) =>
    onChange(
      automations.map((a) =>
        a.id === id ? { ...a, ...patch, config: { ...a.config, ...(patch.config ?? {}) } } : a,
      ),
    );

  const recipes: Record<AutomationType, (a: Automation) => ReactNode> = {
    move_on_status: (a) => (
      <>
        När status ändras till{" "}
        <StatusSelect
          value={a.config.status ?? "done"}
          onChange={(v) => update(a.id, { config: { status: v } })}
        />{" "}
        flytta objektet till{" "}
        <GroupSelect
          value={a.config.listId ?? ""}
          lists={lists}
          onChange={(v) => update(a.id, { config: { listId: v }, enabled: true })}
        />
      </>
    ),
    overdue_status: (a) => (
      <>
        När datumet passerats och objektet inte är Klart, sätt status till{" "}
        <StatusSelect
          value={a.config.status ?? "stuck"}
          exclude={["done"]}
          onChange={(v) => update(a.id, { config: { status: v } })}
        />
      </>
    ),
    date_on_done: () => (
      <>
        När status ändras till <Fixed status="done" />, sätt datumet till idag
      </>
    ),
    default_status: (a) => (
      <>
        När ett objekt skapas, sätt status till{" "}
        <StatusSelect
          value={a.config.status ?? "todo"}
          onChange={(v) => update(a.id, { config: { status: v } })}
        />
      </>
    ),
    collapse_done: () => (
      <>
        När alla objekt i en grupp är <Fixed status="done" />, fäll ihop gruppen
      </>
    ),
  };

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
        aria-label="Automationer"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Zap size={18} strokeWidth={2.25} />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Automatisera</h2>
            <p className="text-sm text-gray-500">Reglerna körs direkt i tavlan när något ändras.</p>
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

        <div className="space-y-2 overflow-y-auto px-6 py-5">
          {automations.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                a.enabled ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-white"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                  a.enabled ? "bg-amber-200 text-amber-700" : "bg-gray-100 text-gray-400"
                }`}
              >
                <Zap size={14} strokeWidth={2.25} />
              </span>
              <span className="flex-1 text-sm leading-7 text-gray-700">{recipes[a.type](a)}</span>
              <button
                type="button"
                role="switch"
                aria-checked={a.enabled}
                aria-label={a.enabled ? "Stäng av regel" : "Slå på regel"}
                onClick={() => update(a.id, { enabled: !a.enabled })}
                className={`mt-1 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                  a.enabled ? "bg-amber-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    a.enabled ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fixed({ status }: { status: TodoStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ background: s.color }}
    >
      {s.label}
    </span>
  );
}

/** A native select painted to look like the status pill it sets. */
function StatusSelect({
  value,
  onChange,
  exclude = [],
}: {
  value: TodoStatus;
  onChange: (v: TodoStatus) => void;
  exclude?: TodoStatus[];
}) {
  const s = STATUS_MAP[value] ?? STATUS_MAP.todo;
  return (
    <span
      className="relative inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ background: s.color }}
    >
      {s.label}
      <ChevronDown size={11} strokeWidth={2.5} />
      <select
        aria-label="Välj status"
        value={value}
        onChange={(e) => onChange(e.target.value as TodoStatus)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {STATUSES.filter((st) => !exclude.includes(st.key)).map((st) => (
          <option key={st.key} value={st.key}>
            {st.label}
          </option>
        ))}
      </select>
    </span>
  );
}

function GroupSelect({
  value,
  lists,
  onChange,
}: {
  value: string;
  lists: TodoList[];
  onChange: (v: string) => void;
}) {
  const g = lists.find((l) => l.id === value);
  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        g ? "text-white" : "border border-dashed border-gray-300 text-gray-500"
      }`}
      style={g ? { background: g.color } : undefined}
    >
      {g ? g.name : "välj grupp"}
      <ChevronDown size={11} strokeWidth={2.5} />
      <select
        aria-label="Välj grupp"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="" disabled>
          Välj grupp…
        </option>
        {lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </span>
  );
}
