"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dices, KeyRound, Loader2, LockOpen } from "lucide-react";
import { TOOL_KEYS, TOOL_NAMES, type ToolKey } from "@/lib/access/tools";
import type { ControlUser } from "@/lib/admin/control";
import { ADMIN_ERRORS, FALLBACK, randomPin } from "./errors";

/** En användare i kontrollcentret: roll, verktyg, PIN-kod och upplåsning. */
export default function UserCard({ user, isMe }: { user: ControlUser; isMe: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinDone, setPinDone] = useState<string | null>(null);

  const tools: ToolKey[] = user.tools ?? [...TOOL_KEYS];

  async function call(what: string, url: string, method: string, body: unknown): Promise<boolean> {
    setBusy(what);
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setError(ADMIN_ERRORS[data.error] ?? FALLBACK);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(FALLBACK);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const patch = (what: string, body: unknown) => call(what, `/api/admin/users/${user.id}`, "PATCH", body);

  function toggleTool(key: ToolKey, on: boolean) {
    const next = on ? [...tools, key] : tools.filter((t) => t !== key);
    void patch("tools", { tools: next });
  }

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    const chosen = pin;
    if (await call("pin", `/api/admin/users/${user.id}/pin`, "POST", { pin: chosen })) {
      setPinDone(chosen);
      setPin("");
      setPinOpen(false);
    }
  }

  const idBase = `u-${user.id}`;

  return (
    <li className="bg-white px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold text-lg mr-1">{user.name}</h3>
        {isMe && <span className="text-xs font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5">Du</span>}
        {user.locked && <span className="text-xs font-bold bg-milou-50 text-milou-600 px-1.5 py-0.5">Låst</span>}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor={`${idBase}-role`} className="text-sm text-gray-600">
            Roll
          </label>
          <select
            id={`${idBase}-role`}
            value={user.is_admin ? "admin" : "user"}
            disabled={!!busy || isMe}
            title={isMe ? "Du kan inte ändra din egen roll" : undefined}
            onChange={(e) => void patch("role", { role: e.target.value })}
            className="border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:border-milou-500 disabled:bg-gray-50 disabled:text-gray-600"
          >
            <option value="user">Användare</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <fieldset className="mt-4" disabled={!!busy || user.is_admin}>
        <legend className="text-sm text-gray-600 mb-2">
          Verktyg {user.is_admin ? "(admin har alltid alla)" : `(${tools.length} av ${TOOL_KEYS.length})`}
        </legend>
        <div className="flex flex-wrap gap-2">
          {TOOL_KEYS.map((key) => {
            const on = user.is_admin || tools.includes(key);
            return (
              <label
                key={key}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-milou-500 ${
                  on ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:border-gray-500"
                } ${user.is_admin ? "opacity-60 cursor-default" : ""}`}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={(e) => toggleTool(key, e.target.checked)} />
                <span aria-hidden className={`w-3 h-3 border ${on ? "bg-peach border-peach" : "border-gray-400"}`} />
                {TOOL_NAMES[key]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!pinOpen ? (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => {
              setPinOpen(true);
              setPinDone(null);
              setPin(randomPin());
            }}
            className="flex items-center gap-1.5 text-sm font-bold border border-gray-300 hover:border-milou-500 hover:text-milou-500 px-3 py-1.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
          >
            <KeyRound className="w-4 h-4" aria-hidden />
            Ny PIN-kod
          </button>
        ) : (
          <form onSubmit={savePin} className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${idBase}-pin`} className="sr-only">
              Ny PIN-kod för {user.name}, 6 siffror
            </label>
            <input
              id={`${idBase}-pin`}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="off"
              autoFocus
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-32 border border-gray-300 px-3 py-1.5 text-sm tracking-[0.2em] focus:outline-none focus:border-milou-500"
            />
            <button
              type="button"
              onClick={() => setPin(randomPin())}
              aria-label="Slumpa ny PIN-kod"
              title="Slumpa ny PIN-kod"
              className="px-2.5 py-1.5 border border-gray-300 text-gray-700 hover:border-milou-500 hover:text-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
            >
              <Dices className="w-4 h-4" aria-hidden />
            </button>
            <button
              type="submit"
              disabled={!!busy || pin.length !== 6}
              className="flex items-center gap-1.5 text-sm font-bold bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-1.5"
            >
              {busy === "pin" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              Spara PIN
            </button>
            <button type="button" onClick={() => setPinOpen(false)} className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5 underline">
              Avbryt
            </button>
          </form>
        )}

        {user.locked && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void call("unlock", "/api/auth/admin/unlock", "POST", { userId: user.id })}
            className="flex items-center gap-1.5 text-sm font-bold border border-gray-300 hover:border-milou-500 hover:text-milou-500 px-3 py-1.5 disabled:opacity-50"
          >
            <LockOpen className="w-4 h-4" aria-hidden />
            Lås upp
          </button>
        )}
        {busy && busy !== "pin" && <Loader2 className="w-4 h-4 animate-spin text-gray-600" aria-label="Sparar" />}
      </div>

      {pinDone && (
        <p role="status" className="mt-3 text-sm text-gray-800 bg-beige/60 px-3 py-2">
          Ny PIN för {user.name}: <strong className="tracking-[0.2em]">{pinDone}</strong>.{" "}
          {isMe ? "Använd den nästa gång du loggar in." : "Skicka den till personen. Hen är utloggad och loggar in med den nya koden."}
        </p>
      )}
      <p role="alert" className="mt-2 text-sm text-milou-600 empty:hidden">
        {error}
      </p>
    </li>
  );
}
