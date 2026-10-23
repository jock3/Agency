"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { AUDIT_ERRORS, fallbackError } from "./errors";

export default function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/intern/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(AUDIT_ERRORS[data.error] ?? fallbackError);
        setLoading(false);
      } else {
        router.push(`/audit/intern/${data.id}`);
      }
    } catch {
      setError(fallbackError);
      setLoading(false);
    }
  }

  const input =
    "border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500 min-w-0";

  return (
    <form onSubmit={create} className="bg-white p-4">
      <h2 className="font-bold mb-3">Nytt projekt</h2>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn, t.ex. Kund AB" className={`${input} flex-1 sm:flex-none sm:w-56`} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Domän, t.ex. kund.se" className={`${input} flex-1 sm:flex-none sm:w-56`} />
        <button
          type="submit"
          disabled={loading || !name.trim() || !url.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Lägg till
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-milou-600">{error}</p>}
    </form>
  );
}
