"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { Action, Priority } from "@/lib/audit/actions";

interface Result {
  url: string;
  seoScore: number;
  geoScore: number;
  pages: number;
  auditedAt: string;
  actions: Action[];
}

const ERRORS: Record<string, string> = {
  INVALID_URL: "Det ser inte ut som en giltig webbadress.",
  BLOCKED_HOST: "Den adressen kan inte granskas.",
  TIMEOUT: "Sajten svarade inte i tid. Prova igen om en stund.",
  NETWORK: "Kom inte åt sajten. Kontrollera adressen.",
  TOO_LARGE: "Sidan är för stor för att granskas.",
  TOO_MANY_REDIRECTS: "Sajten omdirigerar för många gånger.",
  SITE_ERROR: "Sajten svarade med ett fel.",
  NOT_HTML: "Adressen pekar inte på en webbsida.",
};
const fallbackError = "Något gick fel. Försök igen.";

const PRIORITIES: { key: Priority; label: string; hint: string; accent: string }[] = [
  { key: "critical", label: "Kritiskt", hint: "Hindrar synlighet, åtgärda först", accent: "border-milou-500" },
  { key: "high", label: "Hög", hint: "Stor effekt, bör göras snart", accent: "border-milou-300" },
  { key: "medium", label: "Medel", hint: "Förbättrar betyget märkbart", accent: "border-peach" },
  { key: "nice", label: "Nice to have", hint: "Finputs när resten är klart", accent: "border-gray-300" },
];

const fmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

export default function InternDashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

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
      else setResult(data as Result);
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  const actions = result?.actions ?? [];

  return (
    <main className="max-w-6xl w-full mx-auto px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SEO/GEO-audit — internt</h1>
          <p className="text-sm text-gray-500 mt-1">
            {result
              ? `${result.url} · ${result.pages} sidor · granskad ${fmt.format(new Date(result.auditedAt))}`
              : "Betyg och prioriterade åtgärder för sajten."}
          </p>
        </div>
        <form onSubmit={runAudit} className="flex gap-2 w-full sm:w-auto">
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
      </div>

      {error && <p className="mt-4 text-sm text-milou-600">{error}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <ScoreCard label="SEO" description="Hur väl sajten syns i Google." score={result?.seoScore ?? null} />
        <ScoreCard label="GEO" description="Hur väl sajten syns i AI-tjänster som ChatGPT." score={result?.geoScore ?? null} />
      </section>

      <section className="mt-10">
        <h2 className="font-bold mb-4">Åtgärder ({actions.length})</h2>
        <div className="space-y-6">
          {PRIORITIES.map((p) => {
            const items = actions.filter((a) => a.priority === p.key);
            return (
              <div key={p.key} className={`bg-white border-l-4 ${p.accent}`}>
                <div className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold">{p.label}</h3>
                    <p className="text-xs text-gray-500">{p.hint}</p>
                  </div>
                  <span className="text-sm tabular-nums text-gray-500">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-gray-400">
                    {result ? "Inget att åtgärda här." : "Inga åtgärder ännu."}
                  </p>
                ) : (
                  <ul>
                    {items.map((a) => (
                      <li key={a.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5">
                            {a.group}
                          </span>
                          <span className="font-bold text-sm">{a.title}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{a.detail}</p>
                        {a.fix && <p className="text-sm mt-1">{a.fix}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ScoreCard({ label, description, score }: { label: string; description: string; score: number | null }) {
  return (
    <div className="bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{label}</h2>
        <span className="text-xs text-gray-500">av 10</span>
      </div>
      <p className="text-5xl font-bold tabular-nums mt-4">{score ?? "–"}</p>
      <div className="h-1.5 bg-gray-100 mt-4">
        <div className="h-full bg-milou-500 transition-all" style={{ width: `${((score ?? 0) / 10) * 100}%` }} />
      </div>
      <p className="text-sm text-gray-500 mt-3">{score === null ? "Ingen granskning ännu." : description}</p>
    </div>
  );
}
