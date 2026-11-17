"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STATUSES, type Card, type StatusKey } from "@/lib/kanban/cards";

const PRIO: Record<Card["prio"], string> = { hog: "bg-milou-500", medel: "bg-peach", lag: "bg-gray-300" };
const PRIO_LABEL: Record<Card["prio"], string> = { hog: "Hög prio", medel: "Medel prio", lag: "Låg prio" };

export default function Board() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<string>("alla");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<StatusKey | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/kanban", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Kunde inte läsa vaultet");
    setError(null);
    setCards(data.cards);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const projects = useMemo(() => ["alla", ...Array.from(new Set((cards ?? []).map((c) => c.project))).sort()], [cards]);
  const visible = (cards ?? []).filter((c) => project === "alla" || c.project === project);

  async function move(id: string, status: StatusKey) {
    const prev = cards;
    setCards((cs) => (cs ?? []).map((c) => (c.id === id ? { ...c, status } : c)));
    const res = await fetch("/api/kanban", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setCards(prev);
      setError("Flytten sparades inte i vaultet.");
    }
  }

  if (error && !cards) return <p className="text-milou-600">{error}</p>;
  if (!cards) return <p className="text-gray-500">Läser vaultet …</p>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Filtrera på projekt">
        {projects.map((p) => (
          <button
            key={p}
            onClick={() => setProject(p)}
            aria-pressed={project === p}
            className={`h-9 px-4 text-sm font-bold border transition-colors ${
              project === p ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900 border-gray-300 hover:border-gray-900"
            }`}
          >
            {p === "alla" ? "Alla projekt" : p}
          </button>
        ))}
        <button onClick={load} className="ml-auto h-9 px-4 text-sm font-bold text-gray-600 hover:text-gray-900">
          Uppdatera
        </button>
      </div>
      {error && (
        <p className="mb-4 text-milou-600" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {STATUSES.map((col) => {
          const items = visible.filter((c) => c.status === col.key);
          return (
            <section
              key={col.key}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={() => {
                setOver(null);
                const c = cards.find((x) => x.id === dragId);
                if (c && c.status !== col.key) move(c.id, col.key);
                setDragId(null);
              }}
              className={`min-h-[240px] p-3 transition-colors ${over === col.key ? "bg-blush" : "bg-gray-100"}`}
            >
              <h2 className="font-bold text-sm mb-3 flex justify-between">
                {col.label} <span className="text-gray-500">{items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((c) => (
                  <li
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`bg-white p-3 border border-gray-200 cursor-grab active:cursor-grabbing ${dragId === c.id ? "opacity-40" : ""}`}
                  >
                    <p className="text-sm font-bold leading-snug">{c.title}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <span className={`inline-block w-2 h-2 rounded-full ${PRIO[c.prio]}`} role="img" aria-label={PRIO_LABEL[c.prio]} />
                      {c.project}
                    </p>
                    <label className="sr-only" htmlFor={`m-${c.id}`}>
                      Flytta {c.title}
                    </label>
                    <select
                      id={`m-${c.id}`}
                      value={c.status}
                      onChange={(e) => move(c.id, e.target.value as StatusKey)}
                      className="mt-2 w-full text-xs border border-gray-200 h-8 bg-white md:hidden"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
