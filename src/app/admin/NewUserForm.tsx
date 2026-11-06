"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dices, Loader2, UserPlus } from "lucide-react";
import { ADMIN_ERRORS, FALLBACK, randomPin } from "./errors";

const input =
  "border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500";

/** Skapar ett konto. Ingen kan skapa ett själv; admin skickar namn och PIN till personen. */
export default function NewUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; pin: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) setError(ADMIN_ERRORS[data.error] ?? FALLBACK);
      else {
        setCreated({ name: name.trim(), pin });
        setName("");
        setPin("");
        router.refresh();
      }
    } catch {
      setError(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white px-5 py-5">
      <h2 className="font-bold">Lägg till användare</h2>
      <p className="text-sm text-gray-600 mt-1 mb-3">Nya användare får alla verktyg. Begränsa dem i listan nedan.</p>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="new-name" className="sr-only">
          Namn
        </label>
        <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn" required className={`${input} flex-1`} />
        <div className="flex gap-2">
          <label htmlFor="new-pin" className="sr-only">
            PIN-kod, 6 siffror
          </label>
          <input
            id="new-pin"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="PIN, 6 siffror"
            required
            className={`${input} w-40 tracking-[0.2em]`}
          />
          <button
            type="button"
            onClick={() => setPin(randomPin())}
            aria-label="Slumpa PIN-kod"
            title="Slumpa PIN-kod"
            className="px-3 border border-gray-300 text-gray-700 hover:border-milou-500 hover:text-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
          >
            <Dices className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-milou-500"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <UserPlus className="w-4 h-4" aria-hidden />}
          Lägg till
        </button>
      </form>
      <p role="alert" className="mt-2 text-sm text-milou-600 empty:hidden">
        {error}
      </p>
      {created && (
        <p role="status" className="mt-2 text-sm text-gray-800">
          {created.name} är tillagd med PIN <strong className="tracking-[0.2em]">{created.pin}</strong>. Skicka namnet och koden till personen.
        </p>
      )}
    </section>
  );
}
