"use client";

import { useCallback, useEffect, useState } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import { LIMITS, REQUEST_KINDS, REQUEST_STATUSES, TOOL_NAMES, type RequestStatus, type ToolRequest } from "@/lib/requests/types";

interface ListOption {
  id: string;
  name: string;
  archived: boolean;
}

const field = "border border-gray-300 bg-white px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500";
const date = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });

function RequestRow({ r, lists, reload }: { r: ToolRequest; lists: ListOption[]; reload: () => Promise<void> }) {
  const [reply, setReply] = useState(r.admin_reply ?? "");
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, init: RequestInit, failure: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } }).catch(() => null);
    if (!res?.ok) setError(failure);
    else await reload();
    setBusy(false);
  }

  const patch = (updates: object) => call(`/api/forslag/${r.id}`, { method: "PATCH", body: JSON.stringify(updates) }, "Kunde inte spara.");

  return (
    <li className="bg-white border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{r.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {REQUEST_KINDS[r.kind]}
            {r.tool ? `: ${TOOL_NAMES[r.tool]}` : ""} · {r.author} · {date(r.created_at)} · {r.votes} {r.votes === 1 ? "röst" : "röster"}
          </p>
        </div>
        <div>
          <label htmlFor={`st-${r.id}`} className="sr-only">
            Status för {r.title}
          </label>
          <select id={`st-${r.id}`} value={r.status} disabled={busy} onChange={(e) => patch({ status: e.target.value as RequestStatus })} className={field}>
            {(Object.keys(REQUEST_STATUSES) as RequestStatus[]).map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUSES[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.body}</p>
      {r.why && <p className="mt-1 text-sm text-gray-500 whitespace-pre-wrap">Varför: {r.why}</p>}

      <div className="mt-3">
        <label htmlFor={`rp-${r.id}`} className="block text-sm text-gray-600 mb-1">
          Svar till den som föreslog
        </label>
        <textarea id={`rp-${r.id}`} rows={2} maxLength={LIMITS.reply} value={reply} onChange={(e) => setReply(e.target.value)} className={`${field} w-full`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || reply.trim() === (r.admin_reply ?? "")}
          onClick={() => patch({ admin_reply: reply })}
          className="text-sm font-bold border border-gray-300 hover:border-milou-500 hover:text-milou-500 px-3 py-1.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
        >
          Spara svar
        </button>

        {r.task_id ? (
          <span className="text-sm text-gray-500">Finns som uppgift på tavlan</span>
        ) : lists.length > 0 ? (
          <>
            <label htmlFor={`ls-${r.id}`} className="sr-only">
              Lista för uppgiften
            </label>
            <select id={`ls-${r.id}`} value={listId} onChange={(e) => setListId(e.target.value)} className={field}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !listId}
              onClick={() => call(`/api/forslag/${r.id}/task`, { method: "POST", body: JSON.stringify({ list_id: listId }) }, "Kunde inte skapa uppgiften.")}
              className="flex items-center gap-1.5 text-sm font-bold border border-gray-300 hover:border-milou-500 hover:text-milou-500 px-3 py-1.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
            >
              <ListPlus className="w-4 h-4" aria-hidden />
              Skapa uppgift
            </button>
          </>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm(`Ta bort förslaget "${r.title}"? Det går inte att ångra.`)) call(`/api/forslag/${r.id}`, { method: "DELETE" }, "Kunde inte ta bort.");
          }}
          className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-2 py-1.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
          Ta bort
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}

/** Förslagen från användarna: svara, sätt status och gör dem till uppgifter. */
export default function RequestsAdmin() {
  const [items, setItems] = useState<ToolRequest[] | null>(null);
  const [lists, setLists] = useState<ListOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RequestStatus | "open">("open");

  const load = useCallback(async () => {
    try {
      const [reqs, board] = await Promise.all([fetch("/api/forslag"), fetch("/api/todo/board")]);
      if (!reqs.ok) throw new Error();
      setItems(await reqs.json());
      if (board.ok) setLists(((await board.json()).lists as ListOption[]).filter((l) => !l.archived));
      setError(null);
    } catch {
      setError("Kunde inte hämta förslagen.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (s: RequestStatus) => s === "new" || s === "considering";
  const shown = (items ?? [])
    .filter((r) => (filter === "open" ? open(r.status) : r.status === filter))
    .sort((a, b) => b.votes - a.votes || b.created_at.localeCompare(a.created_at));
  const newCount = (items ?? []).filter((r) => r.status === "new").length;

  return (
    <section id="forslag" aria-labelledby="forslag-h" className="mt-12 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 id="forslag-h" className="font-bold">
          Förslag{items ? ` (${newCount} nya)` : ""}
        </h2>
        <div>
          <label htmlFor="forslag-filter" className="sr-only">
            Visa förslag med status
          </label>
          <select id="forslag-filter" value={filter} onChange={(e) => setFilter(e.target.value as RequestStatus | "open")} className={field}>
            <option value="open">Nya och funderar</option>
            {(Object.keys(REQUEST_STATUSES) as RequestStatus[]).map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUSES[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!items && !error && <p className="text-sm text-gray-500">Hämtar…</p>}
      {items && shown.length === 0 && <p className="text-sm text-gray-500">Inga förslag med den statusen.</p>}
      <ul className="space-y-3">
        {shown.map((r) => (
          <RequestRow key={r.id} r={r} lists={lists} reload={load} />
        ))}
      </ul>
    </section>
  );
}
