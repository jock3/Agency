"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createProject, deleteProject, listProjects } from "@/lib/api/formatkoll";
import type { FormatkollListRow } from "@/lib/formatkoll/types";

const DAY = 24 * 60 * 60 * 1000;

function expiry(row: FormatkollListRow): { label: string; tone: string } {
  const left = Date.parse(row.expires_at) - Date.now();
  if (left <= 0) return { label: "Länken har gått ut", tone: "text-red-500" };
  const days = Math.ceil(left / DAY);
  return {
    label: days === 1 ? "1 dag kvar" : `${days} dagar kvar`,
    tone: days <= 1 ? "text-amber-600" : "text-gray-400",
  };
}

export default function FormatkollDashboard() {
  const [rows, setRows] = useState<FormatkollListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [days, setDays] = useState(7);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listProjects());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const p = await createProject(title.trim(), client.trim(), days);
      setShowNew(false);
      setTitle("");
      setClient("");
      window.location.href = `/formatkoll/${p.id}`;
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(row: FormatkollListRow) {
    if (!confirm(`Ta bort "${row.title}"? Filerna raderas och delningslänken slutar fungera.`)) return;
    try {
      await deleteProject(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function copy(row: FormatkollListRow) {
    navigator.clipboard.writeText(`${location.origin}/share/kund/${row.slug}`);
    setCopied(row.id);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow">
        <h1 className="text-base font-semibold">Formatkoll</h1>
        <button
          onClick={() => setShowNew(true)}
          className="bg-milou-500 hover:bg-milou-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nytt projekt
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl h-36 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-lg font-medium text-gray-500">Inga projekt än</p>
            <p className="text-sm mt-1">Skapa ett projekt, ladda upp tre format och skicka länken till kund.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((row) => {
              const e = expiry(row);
              return (
                <div
                  key={row.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="h-1 bg-milou-500" />
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-gray-900 leading-tight">{row.title}</h2>
                      <span className="text-xs text-gray-400 shrink-0">{row.asset_count}/3</span>
                    </div>
                    {row.client_name && (
                      <p className="text-sm text-gray-500 mt-0.5">{row.client_name}</p>
                    )}
                    <p className={`text-xs mt-2 ${e.tone}`}>{e.label}</p>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                    <Link href={`/formatkoll/${row.id}`} className="text-milou-500 font-medium">
                      Öppna →
                    </Link>
                    <span className="flex items-center gap-3">
                      <button onClick={() => copy(row)} className="text-gray-500 hover:text-gray-700">
                        {copied === row.id ? "Kopierad" : "Kopiera länk"}
                      </button>
                      <button onClick={() => remove(row)} className="text-red-500 hover:text-red-600">
                        Ta bort
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={create} className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Nytt projekt</h2>
            <label className="block text-sm text-gray-600 mb-1">Titel</label>
            <input
              autoFocus
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="Vattenbrist höst 2026"
            />
            <label className="block text-sm text-gray-600 mb-1">Kund</label>
            <input
              value={client}
              onChange={(ev) => setClient(ev.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="Region Gotland"
            />
            <label className="block text-sm text-gray-600 mb-1">Delningslänken gäller</label>
            <div className="flex gap-2 mb-6">
              {[1, 3, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    days === d
                      ? "bg-milou-500 border-milou-500 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {d} {d === 1 ? "dag" : "dagar"}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 text-sm text-gray-500"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-milou-500 text-white text-sm font-medium"
              >
                Skapa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
