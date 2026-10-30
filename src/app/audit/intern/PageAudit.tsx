"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { AUDIT_ERRORS, fallbackError } from "./errors";

/**
 * Granskar en enskild sida. Utan `url` visas ett fält där man skriver in en
 * adress eller sökväg; med `url` en knapp som granskar om just den sidan.
 */
export default function PageAudit({ projectId, url }: { projectId: string; url?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const target = url ?? value.trim();
    if (loading || !target) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/intern/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, url: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(AUDIT_ERRORS[data.error] ?? fallbackError);
      else {
        router.push(`/audit/intern/${projectId}/sida?url=${encodeURIComponent(data.url)}`);
        router.refresh();
      }
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  if (url) {
    return (
      <div className="flex flex-col items-end">
        <button type="button" onClick={() => run()} disabled={loading} className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Granskar …" : "Granska om sidan"}
        </button>
        {error && <p className="mt-2 text-sm text-milou-300">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={run}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Klistra in en URL eller skriv en sökväg, till exempel /om-oss"
          className="flex-1 min-w-0 h-10 px-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-milou-500"
        />
        <button type="submit" disabled={loading || !value.trim()} className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Granskar …" : "Granska sida"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-milou-600">{error}</p>}
    </form>
  );
}
