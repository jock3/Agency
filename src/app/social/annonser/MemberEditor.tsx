"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, X } from "lucide-react";
import { ADS_ERRORS, FALLBACK } from "./errors";

/** Medlemmar i ett företag: lägg till med inloggningsnamn, ta bort med krysset. Bara admin ser den. */
export default function MemberEditor({ companyId, members }: { companyId: string; members: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "DELETE", body: Record<string, string>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/annonser/companies/${companyId}/members`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ADS_ERRORS[data.error] ?? FALLBACK);
      else {
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
    <div className="mt-3">
      <p className="text-sm text-gray-600 mb-2">Medlemmar ({members.length})</p>
      {members.length === 0 ? (
        <p className="text-sm text-gray-600">Ingen är medlem än.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-1 bg-gray-100 pl-3 pr-1 py-1 text-sm">
              <span>{m.name}</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => send("DELETE", { userId: m.id })}
                aria-label={`Ta bort ${m.name} ur företaget`}
                className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-milou-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && !loading) void send("POST", { name });
        }}
        className="mt-3 flex flex-wrap gap-2"
      >
        <label htmlFor={`member-${companyId}`} className="sr-only">
          Lägg till användare i företaget
        </label>
        <input
          id={`member-${companyId}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Användarens inloggningsnamn"
          className="border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-milou-500 min-w-0 flex-1 sm:flex-none sm:w-64"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-1.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <UserPlus className="w-4 h-4" aria-hidden />}
          Lägg till
        </button>
      </form>
      <p role="alert" className="mt-2 text-sm text-milou-600 empty:hidden">
        {error}
      </p>
    </div>
  );
}
