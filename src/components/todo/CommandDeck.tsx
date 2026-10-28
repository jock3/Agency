"use client";

import { ArrowRight, CalendarDays, Flag, Folder, Plus, User } from "lucide-react";
import { forwardRef, useMemo, useState } from "react";
import EditInput from "./EditInput";
import FocusLane, { type FocusItem } from "./FocusLane";
import { PRIORITY_MAP } from "@/lib/todo/constants";
import { dueLabel, parseQuickAdd, type ParsedTask } from "@/lib/todo/quickadd";
import type { UserOption } from "@/lib/api/todo";
import type { TodoList } from "@/lib/types";
import type { QuickView } from "./TodoSidebar";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  userName: string | null;
  boardTitle: string;
  onRenameBoard: (title: string) => void;
  saveState: SaveState;
  counts: { today: number; overdue: number };
  week: { done: number; total: number };
  quickView: QuickView;
  onQuickView: (v: QuickView) => void;
  users: UserOption[];
  lists: TodoList[];
  currentUserId: string | null;
  onQuickAdd: (parsed: ParsedTask & { listId: string }) => void;
  focus: FocusItem[];
  onComplete: (id: string) => void;
  onOpen: (id: string) => void;
}

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "God natt";
  if (h < 10) return "God morgon";
  if (h < 17) return "Hej";
  return "God kväll";
}

/** Tavlans cockpit: läget just nu, snabbinmatning och det som brinner. */
const CommandDeck = forwardRef<HTMLInputElement, Props>(function CommandDeck(
  {
    userName,
    boardTitle,
    onRenameBoard,
    saveState,
    counts,
    week,
    quickView,
    onQuickView,
    users,
    lists,
    currentUserId,
    onQuickAdd,
    focus,
    onComplete,
    onOpen,
  },
  inputRef,
) {
  const [text, setText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const now = new Date();
  const firstName = userName?.split(" ")[0];
  const dateLine = now.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });

  const parsed = useMemo(
    () => parseQuickAdd(text, users, lists, currentUserId),
    [text, users, lists, currentUserId],
  );
  const targetList = lists.find((l) => l.id === parsed.listId) ?? lists[0] ?? null;
  const person = users.find((u) => u.id === parsed.personId);

  const submit = () => {
    if (!parsed.title.trim() || !targetList) return;
    onQuickAdd({ ...parsed, listId: targetList.id });
    setText("");
  };

  const tiles: { key: QuickView; value: number; label: string; alert?: boolean }[] = [
    { key: "today", value: counts.today, label: "att göra idag" },
    { key: "overdue", value: counts.overdue, label: "försenade", alert: counts.overdue > 0 },
  ];
  const segments = Math.min(week.total, 24);
  const doneSegments = week.total ? Math.round((week.done / week.total) * segments) : 0;

  return (
    <section className="bg-gray-900 text-white px-6 lg:px-8 pt-8 pb-7">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-4xl leading-tight">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-gray-400">
            <span className="first-letter:uppercase">{dateLine}</span>
            <span aria-hidden>i</span>
            {editingTitle ? (
              <EditInput
                value={boardTitle}
                className="text-gray-900"
                onCancel={() => setEditingTitle(false)}
                onCommit={(v) => {
                  if (v) onRenameBoard(v);
                  setEditingTitle(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                title="Byt namn på tavlan"
                className="text-gray-200 underline decoration-gray-600 decoration-dashed underline-offset-4 hover:text-white hover:decoration-gray-300"
              >
                {boardTitle}
              </button>
            )}
            <span role="status" className={`ml-2 text-xs ${saveState === "error" ? "text-milou-300" : "text-gray-500"}`}>
              {saveState === "saving" ? "Sparar…" : saveState === "error" ? "Fel vid sparning" : ""}
            </span>
          </p>
        </div>

        <div className="flex items-stretch gap-2">
          {tiles.map((t) => {
            const on = quickView === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                onClick={() => onQuickView(on ? "all" : t.key)}
                className={`min-w-[132px] px-4 py-3 text-left transition-colors ${
                  on ? "bg-peach text-gray-900" : "bg-white/[0.06] hover:bg-white/[0.12]"
                }`}
              >
                <span
                  className={`block font-display font-extrabold text-3xl leading-none tabular-nums ${
                    !on && t.alert ? "text-blush" : ""
                  }`}
                >
                  {t.value}
                </span>
                <span className={`mt-1.5 block text-sm ${on ? "text-gray-800" : "text-gray-400"}`}>{t.label}</span>
              </button>
            );
          })}
          <div className="min-w-[200px] bg-white/[0.06] px-4 py-3">
            <span className="block font-display font-extrabold text-3xl leading-none tabular-nums">
              {week.done}
              <span className="text-gray-500 text-xl"> av {week.total}</span>
            </span>
            <span className="mt-1.5 block text-sm text-gray-400">klara den här veckan</span>
            {segments > 0 && (
              <span className="mt-2 flex gap-[3px]" aria-hidden>
                {Array.from({ length: segments }, (_, i) => (
                  <span key={i} className={`h-1.5 flex-1 ${i < doneSegments ? "bg-[#2EA45F]" : "bg-white/15"}`} />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Snabbinmatning */}
      <form
        className="mt-7"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-stretch bg-white text-gray-900 focus-within:shadow-[-8px_8px_0_0_#FFBFB6] transition-shadow">
          <span className="flex items-center pl-4 text-gray-400" aria-hidden>
            <Plus size={20} strokeWidth={2.5} />
          </span>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setText("");
                e.currentTarget.blur();
              }
            }}
            aria-label="Nytt objekt"
            placeholder="Nytt objekt, t.ex. Formatkoll till Brovik imorgon !hög @gustav #brovik"
            className="min-w-0 flex-1 bg-transparent px-3 py-4 text-base outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden md:flex items-center pr-3 text-xs text-gray-400" aria-hidden>
            {text ? "Enter" : "N"}
          </kbd>
          <button
            type="submit"
            disabled={!parsed.title.trim() || !targetList}
            aria-label="Lägg till objekt"
            className="w-14 shrink-0 flex items-center justify-center bg-milou-500 text-white transition-colors hover:bg-milou-600 disabled:bg-gray-200 disabled:text-gray-400"
          >
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-2.5 flex min-h-[26px] flex-wrap items-center gap-2 text-sm">
          {text.trim() ? (
            <>
              {targetList && (
                <Token icon={<Folder size={13} />} dot={targetList.color} muted={!parsed.listId}>
                  {targetList.name}
                </Token>
              )}
              {parsed.due && <Token icon={<CalendarDays size={13} />}>{dueLabel(parsed.due)}</Token>}
              {parsed.priority && (
                <Token icon={<Flag size={13} />} dot={PRIORITY_MAP[parsed.priority].color}>
                  {PRIORITY_MAP[parsed.priority].label}
                </Token>
              )}
              {person && <Token icon={<User size={13} />}>{person.name}</Token>}
            </>
          ) : (
            <span className="text-gray-500">
              Skriv datum som <Hint>imorgon</Hint>, <Hint>fre</Hint> eller <Hint>12/11</Hint>, prioritet med{" "}
              <Hint>!hög</Hint>, person med <Hint>@namn</Hint> och grupp med <Hint>#grupp</Hint>.
            </span>
          )}
        </div>
      </form>

      <FocusLane items={focus} onComplete={onComplete} onOpen={onOpen} />
    </section>
  );
});

export default CommandDeck;

function Token({
  icon,
  dot,
  muted,
  children,
}: {
  icon: React.ReactNode;
  dot?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 ${muted ? "bg-white/[0.06] text-gray-400" : "bg-white/[0.12] text-white"}`}
    >
      {dot ? <span className="h-2 w-2 rounded-full" style={{ background: dot }} /> : null}
      <span className="text-gray-400">{icon}</span>
      {children}
    </span>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <code className="bg-white/[0.08] px-1 py-px font-sans text-gray-200">{children}</code>;
}
