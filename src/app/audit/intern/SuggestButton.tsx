"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { SUGGESTABLE, type PageSuggestions, type SuggestionItem } from "@/lib/audit/suggest-kinds";
import { AUDIT_ERRORS, fallbackError } from "./errors";

const pathOf = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname + u.search || "/";
  } catch {
    return url;
  }
};

/**
 * "Ge förslag" på ett kort i åtgärdslistan. Med `url` gäller förslagen den
 * sidan, annars de sidor i den senaste auditen som drabbas. Förslagen sparas
 * inte: de finns kvar tills sidan laddas om.
 */
export default function SuggestButton({ projectId, checkId, url, enabled }: { projectId: string; checkId: string; url?: string; enabled: boolean }) {
  const [results, setResults] = useState<PageSuggestions[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!SUGGESTABLE.has(checkId) || !enabled) return null;

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/intern/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, checkId, url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(AUDIT_ERRORS[data.error] ?? fallbackError);
      else setResults(data.results as PageSuggestions[]);
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={run} disabled={loading} className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 bg-gray-100 hover:bg-peach/50 disabled:opacity-60">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-milou-500" />}
        {loading ? "Tar fram förslag …" : results ? "Ge nya förslag" : "Ge förslag"}
      </button>
      {error && <p className="mt-2 text-sm text-milou-600">{error}</p>}

      {results && (
        <div className="mt-3 space-y-4">
          {results.map((r) => (
            <div key={r.url} className="border-l-2 border-peach pl-4">
              {(results.length > 1 || !url) && <p className="text-xs font-bold text-gray-500 mb-2">{pathOf(r.url)}</p>}
              {r.error && <p className="text-sm text-gray-500">{r.error}</p>}
              <ul className="space-y-3">
                {r.items.map((item, i) => (
                  <Item key={i} item={item} />
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-gray-500">Skrivet av AI från sidans innehåll. Läs igenom och komplettera [fyll i] innan det används.</p>
        </div>
      )}
    </div>
  );
}

function Item({ item }: { item: SuggestionItem }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Urklipp nekas i vissa webbläsare; texten går ändå att markera.
    }
  }
  return (
    <li>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-gray-500 break-all">
          {item.target}
          {item.kind === "text" && item.value && <span className="ml-2 tabular-nums text-gray-400">{item.value.length} tecken</span>}
        </p>
        <button type="button" onClick={copy} className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-milou-500">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Kopierat" : "Kopiera"}
        </button>
      </div>
      {item.kind === "code" ? (
        <pre className="mt-1 p-3 bg-gray-900 text-gray-100 text-xs overflow-x-auto max-h-72">{item.value}</pre>
      ) : (
        <p className="mt-0.5 max-w-[80ch] whitespace-pre-line">{item.value || <span className="text-gray-400">(lämna alt-texten tom)</span>}</p>
      )}
      {item.note && <p className="mt-0.5 text-xs text-gray-400 max-w-[80ch]">{item.note}</p>}
    </li>
  );
}
