"use client";

import { useState } from "react";
import MilouLogo from "@/components/MilouLogo";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Fel namn eller PIN-kod.",
  ACCOUNT_LOCKED: "Kontot är tillfälligt låst efter för många felaktiga försök. Be en admin låsa upp det, eller försök igen om 15 minuter.",
  INVALID_PIN: "PIN-koden måste vara exakt 6 siffror.",
  INVALID_INPUT: "Något gick fel. Försök igen.",
};

function errorText(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Något gick fel. Försök igen.";
}

export default function LoginPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[0-9]{6}$/.test(pin)) {
      setError(errorText("INVALID_PIN"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = "/";
      } else {
        setError(errorText(data.error) ?? data.error);
      }
    } catch {
      setError("Kunde inte nå servern. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm shadow-plate-peach">
        <div className="bg-red-fade px-6 py-6 flex items-center gap-3">
          <MilouLogo className="h-7 w-auto text-white" />
        </div>


        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Logga in</h1>
            <p className="text-sm text-gray-500 mt-1">Ange namn och PIN-kod.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="name"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-milou-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN-kod (6 siffror)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="current-password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-milou-500"
            />
          </div>


          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 rounded-lg bg-milou-500 text-white text-sm font-medium hover:bg-milou-600 transition-colors disabled:opacity-50"
          >
            {submitting ? "Skickar..." : "Logga in"}
          </button>

          <p className="text-xs text-gray-400 text-center">Inget konto? Be en admin lägga till dig.</p>
        </form>
      </div>
    </div>
  );
}
