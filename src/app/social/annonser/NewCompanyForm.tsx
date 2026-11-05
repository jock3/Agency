"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { ADS_ERRORS, FALLBACK } from "./errors";

export default function NewCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/annonser/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ADS_ERRORS[data.error] ?? FALLBACK);
      } else {
        setName("");
        router.refresh();
      }
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={create} className="bg-white p-4">
      <label htmlFor="company-name" className="font-bold block mb-2">
        Nytt företag
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="company-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Till exempel: Testföretag A"
          className="border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500 min-w-0 flex-1 sm:flex-none sm:w-72"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
          Skapa
        </button>
      </div>
      <p role="alert" className="mt-2 text-sm text-milou-600 empty:hidden">
        {error}
      </p>
    </form>
  );
}
