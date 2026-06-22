"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onCreate: (name: string, start: string, end: string) => Promise<void>;
}

export default function NewPlanModal({ onClose, onCreate }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), start, end);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Ny mediaplan</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kampanjnamn
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. Sommarkampanj 2025"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Slutdatum</label>
              <input
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Skapar…" : "Skapa plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
