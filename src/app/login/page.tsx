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
    <div className="min-h-screen bg-gray-900 text-white flex items-center">
      <div className="w-full max-w-[1112px] mx-auto px-6 md:px-8 py-12 grid gap-12 lg:grid-cols-[1fr_400px] lg:items-center">
        <div>
          <MilouLogo className="h-6 w-auto text-white" />
          <p className="milou-kicker mt-12 lg:mt-16">Milou AI-hub</p>
          <h1 className="milou-display mt-4">
            Logga in.
            <span className="block text-blush">Verktygen väntar.</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white text-gray-900 shadow-plate-peach p-6 sm:p-8 flex flex-col gap-5 ml-5 lg:ml-0">
          <p className="text-gray-600">Ange namn och PIN-kod.</p>

          {error && (
            <p role="alert" className="text-sm text-milou-600 bg-milou-50 border-l-4 border-milou-500 px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="login-name" className="block text-sm font-bold text-gray-800 mb-1.5">
              Namn
            </label>
            <input
              id="login-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="name"
              required
              className="w-full h-11 border border-gray-500 px-3 focus:outline-none focus:border-milou-500 focus:ring-2 focus:ring-milou-500"
            />
          </div>

          <div>
            <label htmlFor="login-pin" className="block text-sm font-bold text-gray-800 mb-1.5">
              PIN-kod (6 siffror)
            </label>
            <input
              id="login-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="current-password"
              required
              className="w-full h-11 border border-gray-500 px-3 tracking-[0.3em] focus:outline-none focus:border-milou-500 focus:ring-2 focus:ring-milou-500"
            />
          </div>

          <button type="submit" disabled={submitting} className="milou-btn milou-btn-red w-full mt-1">
            {submitting ? "Skickar..." : "Logga in"}
          </button>

          <p className="text-sm text-gray-600 text-center">Inget konto? Be en admin lägga till dig.</p>
        </form>
      </div>
    </div>
  );
}
