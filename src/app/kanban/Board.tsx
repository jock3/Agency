"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { STATUSES, type Card, type StatusKey } from "@/lib/kanban/cards";

const PRIO_ORDER: Record<Card["prio"], number> = { hog: 0, medel: 1, lag: 2 };
const PRIO_LABEL: Record<Card["prio"], string> = { hog: "Hög prio", medel: "Medel", lag: "Låg" };
const LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label])) as Record<StatusKey, string>;

/** Pågår är kolumnen tavlan finns till för: den enda med färgad yta. */
const FOCUS: StatusKey = "doing";

const byPrio = (a: Card, b: Card) => PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio] || b.created.localeCompare(a.created);

interface Undo {
  id: string;
  title: string;
  from: StatusKey;
  to: StatusKey;
}

export default function Board() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<string>("alla");
  const [onlyHigh, setOnlyHigh] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<StatusKey | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusKey>("todo");
  const [undo, setUndo] = useState<Undo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kanban", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Kunde inte läsa vaultet");
      setError(null);
      setCards(data.cards);
    } catch {
      setError("Kunde inte nå vaultet. Kontrollera nätet och försök igen.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => () => void (undoTimer.current && clearTimeout(undoTimer.current)), []);

  const projects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards ?? []) counts.set(c.project, (counts.get(c.project) ?? 0) + 1);
    return Array.from(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [cards]);

  const visible = (cards ?? []).filter((c) => (project === "alla" || c.project === project) && (!onlyHigh || c.prio === "hog"));
  const columns = STATUSES.map((s) => ({ ...s, items: visible.filter((c) => c.status === s.key).sort(byPrio) }));

  async function move(id: string, status: StatusKey, { record = true } = {}) {
    const card = cards?.find((c) => c.id === id);
    if (!card || card.status === status) return;
    const prev = cards;
    setCards((cs) => (cs ?? []).map((c) => (c.id === id ? { ...c, status } : c)));
    if (record) {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setUndo({ id, title: card.title, from: card.status, to: status });
      undoTimer.current = setTimeout(() => setUndo(null), 8000);
    }
    const res = await fetch("/api/kanban", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    if (!res?.ok) {
      setCards(prev);
      setUndo(null);
      setError(`”${card.title}” flyttades inte. Vaultet svarade inte, försök igen.`);
    }
  }

  if (error && !cards)
    return (
      <div role="alert" className="border-2 border-gray-900 p-6 max-w-xl">
        <p className="font-bold">Tavlan kunde inte läsas</p>
        <p className="mt-1 text-gray-700">{error}</p>
        <button onClick={load} className="mt-4 h-10 px-4 bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-milou-500">
          Försök igen
        </button>
      </div>
    );
  if (!cards) return <p className="text-gray-600" aria-live="polite">Läser vaultet …</p>;

  const chip = (active: boolean) =>
    `h-9 px-3.5 text-sm font-bold border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-milou-500 ${
      active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900 border-gray-300 hover:border-gray-900"
    }`;

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-start gap-3 mb-6">
        <div role="group" aria-label="Filtrera på projekt" className="flex gap-2 overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible [scrollbar-width:none]">
          <button onClick={() => setProject("alla")} aria-pressed={project === "alla"} className={`shrink-0 ${chip(project === "alla")}`}>
            Alla projekt <span className="tabular-nums font-normal opacity-70">{cards.length}</span>
          </button>
          {projects.map(([p, n]) => (
            <button key={p} onClick={() => setProject(p)} aria-pressed={project === p} className={`shrink-0 ${chip(project === p)}`}>
              {p || "Utan projekt"} <span className="tabular-nums font-normal opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto shrink-0">
          <button onClick={() => setOnlyHigh((v) => !v)} aria-pressed={onlyHigh} className={chip(onlyHigh)}>
            Bara hög prio
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="h-9 px-3 inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 disabled:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-milou-500"
          >
            <RefreshCw aria-hidden size={15} strokeWidth={2.25} className={loading ? "motion-safe:animate-spin" : ""} />
            {loading ? "Uppdaterar" : "Uppdatera"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 px-4 py-3 bg-milou-50 text-milou-700 font-bold" role="alert">
          {error}
        </p>
      )}

      {/* Mobil: en kolumn i taget. */}
      <div role="tablist" aria-label="Kolumn" className="lg:hidden flex overflow-x-auto gap-1 mb-4 -mx-6 px-6 border-b-2 border-gray-900">
        {columns.map((col) => (
          <button
            key={col.key}
            role="tab"
            aria-selected={tab === col.key}
            onClick={() => setTab(col.key)}
            className={`shrink-0 h-11 px-3 text-sm font-bold -mb-[2px] border-b-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500 ${
              tab === col.key ? "border-milou-500 text-gray-900" : "border-transparent text-gray-600"
            }`}
          >
            {col.label} <span className="tabular-nums font-normal">{col.items.length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
        {columns.map((col) => {
          const focus = col.key === FOCUS;
          return (
            <section
              key={col.key}
              aria-labelledby={`h-${col.key}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === col.key ? null : o));
              }}
              onDrop={() => {
                setOver(null);
                if (dragId) move(dragId, col.key);
                setDragId(null);
              }}
              className={`${tab === col.key ? "flex" : "hidden"} lg:flex flex-col min-w-0 ${
                over === col.key ? "outline outline-2 outline-dashed outline-gray-900 outline-offset-4" : ""
              }`}
            >
              <h2 id={`h-${col.key}`} className="max-lg:sr-only flex items-baseline justify-between gap-2 pb-2 border-b-2 border-gray-900">
                <span className="font-display font-extrabold text-lg">{col.label}</span>
                <span className="font-display font-extrabold text-lg tabular-nums text-gray-600">{col.items.length}</span>
              </h2>
              <ul
                className={`flex-1 space-y-2 py-3 lg:max-h-[calc(100vh-17rem)] lg:overflow-y-auto overscroll-contain transition-colors ${
                  focus ? "px-3 bg-peach/40" : "lg:pr-1"
                } ${over === col.key ? "bg-peach/30" : ""}`}
              >
                {col.items.length === 0 && (
                  <li className="py-6 text-sm text-gray-600">{dragId ? "Släpp här" : "Inga kort här"}</li>
                )}
                {col.items.map((c) => {
                  const expanded = open === c.id;
                  return (
                    <li
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(c.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      className={`group bg-white border border-gray-200 hover:border-gray-900 focus-within:border-gray-900 cursor-grab active:cursor-grabbing transition-[border-color,opacity] ${
                        dragId === c.id ? "opacity-40" : ""
                      }`}
                    >
                      <button
                        onClick={() => setOpen(expanded ? null : c.id)}
                        aria-expanded={expanded}
                        className="block w-full text-left p-3 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-milou-500"
                      >
                        <span className="block text-[15px] font-bold leading-snug text-gray-900 [overflow-wrap:anywhere]">{c.title}</span>
                        <span className="mt-2 flex items-center justify-between gap-2 text-[13px]">
                          <span className="text-gray-600 truncate">{project === "alla" ? c.project : ""}</span>
                          <span className={`shrink-0 whitespace-nowrap ${c.prio === "hog" ? "font-bold text-milou-600" : "text-gray-600"}`}>{PRIO_LABEL[c.prio]}</span>
                        </span>
                      </button>
                      {expanded && (
                        <div className="px-3 pb-2 text-sm text-gray-700 whitespace-pre-line [overflow-wrap:anywhere]">
                          {c.body || "Ingen beskrivning i kortet."}
                          {c.created && <p className="mt-2 text-[13px] text-gray-600">Skapat {c.created}</p>}
                        </div>
                      )}
                      <div className={`px-3 pb-3 ${expanded ? "" : "lg:sr-only lg:group-hover:not-sr-only lg:group-focus-within:not-sr-only"}`}>
                        <label className="sr-only" htmlFor={`m-${c.id}`}>
                          Flytta ”{c.title}”
                        </label>
                        <select
                          id={`m-${c.id}`}
                          value={c.status}
                          onChange={(e) => move(c.id, e.target.value as StatusKey)}
                          className="w-full h-9 px-2 text-[13px] border border-gray-300 bg-white text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.key === c.status ? `I ${s.label.toLowerCase()}` : `Flytta till ${s.label.toLowerCase()}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(560px,calc(100vw-2rem))]">
        {undo && (
          <div className="flex items-center gap-4 bg-gray-900 text-white px-4 py-3 shadow-plate-peach">
            <p className="flex-1 min-w-0 text-sm">
              <span className="font-bold">{undo.title}</span> flyttat till {LABEL[undo.to].toLowerCase()}.
            </p>
            <button
              onClick={() => {
                move(undo.id, undo.from, { record: false });
                setUndo(null);
              }}
              className="shrink-0 h-9 px-3 text-sm font-bold bg-white text-gray-900 hover:bg-peach focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach"
            >
              Ångra
            </button>
          </div>
        )}
      </div>
    </>
  );
}
