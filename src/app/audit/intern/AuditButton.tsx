"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { AUDIT_ERRORS, fallbackError } from "./errors";

/** Kör en ny granskning av projektets domän och visar körningen när den är sparad. */
export default function AuditButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/intern/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(AUDIT_ERRORS[data.error] ?? fallbackError);
      else router.push(`/audit/intern/${projectId}?run=${data.id}`);
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={runAudit}
        disabled={loading}
        className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {loading ? "Granskar …" : "Ny audit"}
      </button>
      {error && <p className="mt-2 text-sm text-milou-600">{error}</p>}
    </div>
  );
}
