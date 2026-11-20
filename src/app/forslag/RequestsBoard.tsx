"use client";

import { useCallback, useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { LIMITS, REQUEST_KINDS, REQUEST_STATUSES, TOOL_KEYS, TOOL_NAMES, type RequestKind, type ToolKey, type ToolRequest } from "@/lib/requests/types";

const field =
  "w-full border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach";

export const statusStyle: Record<ToolRequest["status"], string> = {
  new: "bg-gray-100 text-gray-700",
  considering: "bg-amber-100 text-amber-800",
  planned: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-700",
};

const date = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });

export default function RequestsBoard() {
  const [items, setItems] = useState<ToolRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  const [kind, setKind] = useState<RequestKind>("new");
  const [tool, setTool] = useState<ToolKey>(TOOL_KEYS[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [why, setWhy] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/forslag");
      if (!res.ok) throw new Error();
      setItems(await res.json());
      setError(null);
    } catch {
      setError("Kunde inte hämta förslagen. Försök igen.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setFormError(null);
    setSent(false);
    try {
      const res = await fetch("/api/forslag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, tool: kind === "change" ? tool : null, title, body, why }),
      });
      if (res.status === 429) throw new Error("Du har skickat många förslag på kort tid. Vänta en stund och försök igen.");
      if (!res.ok) throw new Error("Förslaget kunde inte skickas. Kontrollera att rubrik och beskrivning är ifyllda.");
      setTitle("");
      setBody("");
      setWhy("");
      setSent(true);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function vote(id: string) {
    // Optimistiskt: räknaren flyttas direkt och rättas av nästa hämtning om anropet misslyckas.
    setItems((cur) => cur && cur.map((r) => (r.id === id ? { ...r, voted: !r.voted, votes: r.votes + (r.voted ? -1 : 1) } : r)));
    const res = await fetch(`/api/forslag/${id}/vote`, { method: "POST" }).catch(() => null);
    if (!res?.ok) load();
  }

  const shown = (items ?? [])
    .filter((r) => !onlyMine || r.mine)
    .sort((a, b) => b.votes - a.votes || b.created_at.localeCompare(a.created_at));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] items-start">
      <form onSubmit={submit} className="bg-white border border-gray-200 p-5 space-y-4">
        <h2 className="font-display font-extrabold text-xl">Nytt förslag</h2>

        <fieldset>
          <legend className="text-sm text-gray-600 mb-1">Vad gäller det?</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(REQUEST_KINDS) as RequestKind[]).map((k) => (
              <label
                key={k}
                className={`px-3 py-1.5 text-sm font-bold border cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-peach ${
                  kind === k ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700 hover:border-gray-900"
                }`}
              >
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                {REQUEST_KINDS[k]}
              </label>
            ))}
          </div>
        </fieldset>

        {kind === "change" && (
          <div>
            <label htmlFor="req-tool" className="block text-sm text-gray-600 mb-1">
              Vilket verktyg?
            </label>
            <select id="req-tool" value={tool} onChange={(e) => setTool(e.target.value as ToolKey)} className={field}>
              {TOOL_KEYS.map((k) => (
                <option key={k} value={k}>
                  {TOOL_NAMES[k]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="req-title" className="block text-sm text-gray-600 mb-1">
            Rubrik
          </label>
          <input id="req-title" required minLength={3} maxLength={LIMITS.title} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="req-body" className="block text-sm text-gray-600 mb-1">
            Vad vill du kunna göra?
          </label>
          <textarea id="req-body" required maxLength={LIMITS.body} rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="req-why" className="block text-sm text-gray-600 mb-1">
            Varför, och vad löser det? <span className="text-gray-600">(valfritt)</span>
          </label>
          <textarea id="req-why" maxLength={LIMITS.why} rows={3} value={why} onChange={(e) => setWhy(e.target.value)} className={field} />
        </div>

        <div aria-live="polite">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {sent && <p className="text-sm text-green-700">Tack! Förslaget är inskickat.</p>}
        </div>

        <button
          type="submit"
          disabled={sending}
          className="bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white h-11 px-5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach"
        >
          {sending ? "Skickar…" : "Skicka förslag"}
        </button>
      </form>

      <section aria-labelledby="req-list">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="req-list" className="font-display font-extrabold text-xl">
            Alla förslag{items ? ` (${shown.length})` : ""}
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Visa bara mina
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!items && !error && <p className="mt-4 text-sm text-gray-600">Hämtar…</p>}
        {items && shown.length === 0 && <p className="mt-4 text-sm text-gray-600">{onlyMine ? "Du har inte skickat något förslag än." : "Inga förslag än. Bli först!"}</p>}

        <ul className="mt-4 space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="bg-white border border-gray-200 p-4 flex gap-4">
              <button
                type="button"
                onClick={() => vote(r.id)}
                aria-pressed={r.voted}
                aria-label={`${r.voted ? "Ta bort din röst på" : "Rösta på"} ${r.title}. ${r.votes} röster`}
                className={`shrink-0 w-14 h-14 flex flex-col items-center justify-center border text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${
                  r.voted ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700 hover:border-gray-900"
                }`}
              >
                <ThumbsUp className="w-4 h-4" aria-hidden />
                {r.votes}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{r.title}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 ${statusStyle[r.status]}`}>{REQUEST_STATUSES[r.status]}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {REQUEST_KINDS[r.kind]}
                  {r.tool ? `: ${TOOL_NAMES[r.tool]}` : ""} · {r.mine ? "du" : r.author} · {date(r.created_at)}
                </p>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.body}</p>
                {r.why && <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">Varför: {r.why}</p>}
                {r.admin_reply && (
                  <p className="mt-3 border-l-4 border-peach bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                    <span className="font-bold">Svar:</span> {r.admin_reply}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
