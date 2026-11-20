"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { HIDDEN_TOOLS_COOKIE, HIDDEN_TOOLS_EVENT, TOOL_NAMES, type ToolKey } from "@/lib/access/tools";

/**
 * Låter användaren själv välja vilka av sina verktyg som syns på startsidan
 * och i menyn. Valet sparas i en kaka i webbläsaren, ett år.
 */
export default function ToolPicker({ available, hidden }: { available: ToolKey[]; hidden: ToolKey[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function toggle(key: ToolKey, show: boolean) {
    const next = show ? hidden.filter((k) => k !== key) : [...hidden, key];
    document.cookie = `${HIDDEN_TOOLS_COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=31536000; samesite=lax`;
    // Menyn läser kakan själv och behöver veta att den ändrats.
    window.dispatchEvent(new Event(HIDDEN_TOOLS_EVENT));
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="tool-picker"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-milou-500"
      >
        <Settings2 className="w-4 h-4" aria-hidden />
        {open ? "Klar" : "Välj vilka verktyg du ser"}
      </button>
      {open && (
        <fieldset id="tool-picker" className="mt-4">
          <legend className="text-sm text-gray-600 mb-2">
            Visas på startsidan och i menyn ({available.length - hidden.length} av {available.length})
          </legend>
          <div className="flex flex-wrap gap-2">
            {available.map((key) => {
              const on = !hidden.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm border cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-milou-500 ${
                    on ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={(e) => toggle(key, e.target.checked)} />
                  <span aria-hidden className={`w-3 h-3 border ${on ? "bg-peach border-peach" : "border-gray-400"}`} />
                  {TOOL_NAMES[key]}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
