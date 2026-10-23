"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

const ERRORS: Record<string, string> = {
  INVALID_URL: "Det ser inte ut som en giltig webbadress.",
  BLOCKED_HOST: "Den adressen kan inte granskas.",
  TIMEOUT: "Sajten svarade inte i tid. Prova igen om en stund.",
  NETWORK: "Kom inte åt sajten. Kontrollera adressen.",
  TOO_LARGE: "Sidan är för stor för att granskas.",
  TOO_MANY_REDIRECTS: "Sajten omdirigerar för många gånger.",
  SITE_ERROR: "Sajten svarade med ett fel.",
  NOT_HTML: "Adressen pekar inte på en webbsida.",
  SERVER_ERROR: "Granskningen kunde inte sparas. Är migration 0009 körd?",
};
const fallbackError = "Något gick fel. Försök igen.";

/** Kör en ny granskning och visar den sparade körningen när den är klar. */
export default function AuditForm({ defaultUrl }: { defaultUrl: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(defaultUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/intern/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ERRORS[data.error] ?? fallbackError);
      else router.push(`/audit/intern?run=${data.id}`);
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <form onSubmit={runAudit} className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="exempel.se"
          className="flex-1 sm:w-64 border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Granskar …" : "Audit"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-milou-600">{error}</p>}
    </div>
  );
}
