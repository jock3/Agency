"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const ERRORS: Record<string, string> = {
  INVALID_TITLE: "Rubriken måste vara 1–120 tecken.",
  INVALID_PERIOD: "Slutdatum får inte vara före startdatum.",
};
const FALLBACK = "Något gick fel. Försök igen.";

const today = () => new Date().toISOString().slice(0, 10);

export default function NewReportForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/social/rapport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, title, periodStart: start, periodEnd: end }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ERRORS[data.error] ?? FALLBACK);
      else router.push(`/social/rapport/${companyId}/${data.id}`);
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  const field = "border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500";
  return (
    <form onSubmit={create} className="bg-white p-4">
      <h3 className="font-bold mb-2">Ny rapport</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Rubrik</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Till exempel: Julkampanj 2026" className={`${field} w-72`} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Från</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Till</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
        </label>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
          Skapa
        </button>
      </div>
      <p role="alert" className="mt-2 text-sm text-milou-600 empty:hidden">
        {error}
      </p>
    </form>
  );
}
