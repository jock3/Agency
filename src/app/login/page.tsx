"use client";

import { useState } from "react";
import MilouLogo from "@/components/MilouLogo";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Fel namn eller PIN-kod.",
  ACCOUNT_LOCKED: "Kontot är tillfälligt låst efter för många felaktiga försök. Be en admin låsa upp det, eller försök igen om 15 minuter.",
  NAME_TAKEN: "Namnet är redan taget. Välj ett annat.",
  NAME_REQUIRED: "Ange ett namn.",
  INVALID_PIN: "PIN-koden måste vara exakt 6 siffror.",
  INVALID_INPUT: "Något gick fel. Försök igen.",
};

function errorText(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Något gick fel. Försök igen.";
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError(null);
    setPin("");
    setPinConfirm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[0-9]{6}$/.test(pin)) {
      setError(errorText("INVALID_PIN"));
      return;
    }
    if (mode === "signup" && pin !== pinConfirm) {
      setError("PIN-koderna matchar inte.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
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
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gray-900 px-6 py-5 flex items-center gap-3">
          <MilouLogo className="h-7 w-auto text-white" />
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => switchMode("login")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "login" ? "text-milou-600 border-b-2 border-milou-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Logga in
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "signup" ? "text-milou-600 border-b-2 border-milou-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Skapa konto
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {mode === "login" ? "Logga in" : "Skapa konto"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "login" ? "Ange namn och PIN-kod." : "Välj ett namn och en 6-siffrig PIN-kod."}
            </p>
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-milou-500"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bekräfta PIN-kod</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="new-password"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-milou-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 rounded-lg bg-milou-500 text-white text-sm font-medium hover:bg-milou-600 transition-colors disabled:opacity-50"
          >
            {submitting ? "Skickar..." : mode === "login" ? "Logga in" : "Skapa konto"}
          </button>
        </form>
      </div>
    </div>
  );
}
