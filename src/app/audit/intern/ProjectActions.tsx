"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { AUDIT_ERRORS, fallbackError } from "./errors";

type Mode = "idle" | "rename" | "delete";

/** Byt namn på eller ta bort ett projekt. Borttagning kräver en extra bekräftelse. */
export default function ProjectActions({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState(name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(next: Mode) {
    setMode(next);
    setDraft(name);
    setError(null);
  }

  async function send(method: "PATCH" | "DELETE") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/intern/projects/${projectId}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PATCH" ? JSON.stringify({ name: draft }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(AUDIT_ERRORS[data.error] ?? fallbackError);
      } else if (method === "DELETE") {
        router.push("/audit/intern");
        return;
      } else {
        setMode("idle");
        router.refresh();
      }
    } catch {
      setError(fallbackError);
    }
    setLoading(false);
  }

  const small = "flex items-center gap-1 text-xs font-bold px-2 py-1 disabled:opacity-50";

  return (
    <div className="mt-2">
      {mode === "idle" && (
        <div className="flex gap-1">
          <button type="button" onClick={() => reset("rename")} className={`${small} text-gray-500 hover:text-milou-500`}>
            <Pencil className="w-3 h-3" /> Byt namn
          </button>
          <button type="button" onClick={() => reset("delete")} className={`${small} text-gray-500 hover:text-milou-500`}>
            <Trash2 className="w-3 h-3" /> Ta bort
          </button>
        </div>
      )}

      {mode === "rename" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() && !loading) send("PATCH");
          }}
          className="flex flex-wrap gap-1"
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:border-milou-500 w-56"
          />
          <button type="submit" disabled={loading || !draft.trim()} className={`${small} bg-milou-500 hover:bg-milou-600 text-white`}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Spara
          </button>
          <button type="button" onClick={() => reset("idle")} className={`${small} text-gray-500 hover:text-gray-800`}>
            <X className="w-3 h-3" /> Avbryt
          </button>
        </form>
      )}

      {mode === "delete" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Ta bort projektet och alla dess granskningar?</span>
          <button type="button" onClick={() => send("DELETE")} disabled={loading} className={`${small} bg-milou-500 hover:bg-milou-600 text-white`}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Ja, ta bort
          </button>
          <button type="button" onClick={() => reset("idle")} className={`${small} text-gray-500 hover:text-gray-800`}>
            Avbryt
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-milou-600">{error}</p>}
    </div>
  );
}
