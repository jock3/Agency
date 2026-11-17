"use client";

import { useEffect, useId, useState } from "react";

/** Väljer företag när du är medlem i flera. Rapporten skapas i det valda företaget. */
export default function ReportCompanyPicker({ planName, companies, onPick, onClose }: { planName: string; companies: { id: string; name: string }[]; onPick: (companyId: string) => void; onClose: () => void }) {
  const titleId = useId();
  const [id, setId] = useState(companies[0]?.id ?? "");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(e) => { e.preventDefault(); if (id) onPick(id); }}
        className="bg-white w-full max-w-md p-5 shadow-2xl"
      >
        <h2 id={titleId} className="font-bold text-lg">Skapa rapport</h2>
        <p className="text-sm text-gray-600 mt-1">Rapporten för <b>{planName}</b> sparas i det företag du väljer. Namn, period och taggar kopieras från planen.</p>
        <label className="block text-sm mt-4">
          <span className="block text-gray-600 mb-1">Företag</span>
          <select value={id} onChange={(e) => setId(e.target.value)} className="w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500">
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="h-9 px-3.5 border border-gray-300 bg-white text-sm hover:bg-gray-50">Avbryt</button>
          <button type="submit" className="h-9 px-3.5 bg-milou-500 hover:bg-milou-600 text-white text-sm font-bold">Skapa rapport</button>
        </div>
      </form>
    </div>
  );
}
