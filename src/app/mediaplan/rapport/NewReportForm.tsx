"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

const ERRORS: Record<string, string> = { INVALID_NAME: "Skriv ett kundnamn (högst 160 tecken)." };
const FALLBACK = "Något gick fel. Försök igen.";
const field = "border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500";

export default function NewReportForm({ companies }: { companies: { id: string; name: string }[] }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [client, setClient] = useState("");
  const [campaign, setCampaign] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!client.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mediaplan/rapport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, client, campaign }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ERRORS[data.error] ?? FALLBACK);
      else router.push(`/mediaplan/rapport/${data.id}`);
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={create} className="bg-white p-4">
      <h3 className="font-bold mb-2">Ny rapport</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Företag</span>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={field}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Kund</span>
          <input value={client} onChange={(e) => setClient(e.target.value)} maxLength={160} placeholder="Till exempel: Solbacka Camping" className={`${field} w-64`} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Kampanj</span>
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={160} placeholder="Till exempel: Sommarsäsongen 2026" className={`${field} w-64`} />
        </label>
        <button
          type="submit"
          disabled={loading || !client.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
          Skapa
        </button>
      </div>
      <p role="alert" className="mt-2 text-sm text-milou-600 empty:hidden">{error}</p>
    </form>
  );
}
