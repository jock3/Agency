"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { AUDIT_ERRORS, fallbackError } from "./errors";

interface Message {
  role: "user" | "assistant";
  content: string;
  used?: string[];
}

const TOOL_LABELS: Record<string, string> = {
  get_project_overview: "projektets audit",
  get_history: "historiken",
  get_page_report: "sidrapport",
  run_page_audit: "ny sidgranskning",
  audit_external_page: "extern granskning",
  web_search: "webbsökning",
};

/**
 * Chatt med SEO-assistenten. Konversationen finns bara i webbläsaren och
 * försvinner när sidan laddas om. Servern får hela historiken med varje fråga.
 */
export default function Assistant({ projectId, domain, enabled }: { projectId: string; domain: string; enabled: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const suggestions = [
    "Vad ska vi fixa först för störst effekt?",
    "Vad har förändrats sedan förra auditen?",
    `Hur står sig ${domain} mot en konkurrent? (ange adress)`,
  ];

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/intern/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(AUDIT_ERRORS[data.error] ?? fallbackError);
      else setMessages([...next, { role: "assistant", content: data.reply, used: data.used }]);
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-milou-500" />
        <h2 className="font-display font-extrabold text-2xl">SEO-assistent</h2>
      </div>

      <div className="bg-white border-l-4 border-plum">
        {messages.length === 0 && !loading ? (
          <div className="px-5 py-5">
            <p className="text-gray-600 max-w-[70ch]">
              Fråga om projektets audit, historik eller enskilda sidor, eller jämför med en konkurrent. Assistenten läser era egna resultat och kan söka på webben. Den kan inte ändra något på sajten.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" disabled={!enabled} onClick={() => (s.includes("konkurrent") ? setInput("Jämför med https://") : send(s))} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-peach/40 disabled:opacity-50 text-left">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="px-5 py-4 space-y-4 max-h-[520px] overflow-y-auto">
            {messages.map((m, i) => (
              <li key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user" ? "bg-gray-900 text-white px-4 py-2.5 max-w-[80%]" : "max-w-[80ch]"}>
                  <p className="whitespace-pre-line">{m.content}</p>
                  {m.used && m.used.length > 0 && (
                    <p className="mt-2 text-xs text-gray-400">Underlag: {m.used.map((u) => TOOL_LABELS[u] ?? u).join(", ")}</p>
                  )}
                </div>
              </li>
            ))}
            {loading && (
              <li className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Läser resultaten …
              </li>
            )}
            <div ref={bottom} />
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 px-5 py-4 border-t border-gray-100"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!enabled}
            maxLength={2000}
            placeholder={enabled ? "Ställ en fråga om projektet …" : "AI är avstängt (ANTHROPIC_API_KEY saknas)"}
            className="flex-1 min-w-0 h-10 px-3 border border-gray-200 text-sm focus:outline-none focus:border-milou-500 disabled:bg-gray-50"
          />
          <button type="submit" disabled={!enabled || loading || !input.trim()} className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4">
            <Send className="w-4 h-4" /> Skicka
          </button>
        </form>
        {error && <p className="px-5 pb-4 -mt-2 text-sm text-milou-600">{error}</p>}
      </div>
      <p className="mt-2 text-xs text-gray-500">Svaren skrivs av AI utifrån projektets audits och webbsökning. Läs igenom innan de används. Sökvolymer och ranking finns inte i underlaget.</p>
    </section>
  );
}
