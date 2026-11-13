"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import CheckGroups from "@/components/audit/CheckGroups";
import type { PublicAuditResult } from "@/lib/audit/types";

const ERRORS: Record<string, string> = {
  INVALID_URL: "Det ser inte ut som en giltig webbadress. Prova till exempel milou.se.",
  BLOCKED_HOST: "Den adressen kan vi inte granska.",
  TIMEOUT: "Sajten svarade inte i tid. Prova igen om en stund.",
  NETWORK: "Vi kom inte åt sajten. Kontrollera adressen.",
  TOO_LARGE: "Sidan är för stor för att granskas.",
  TOO_MANY_REDIRECTS: "Sajten omdirigerar för många gånger.",
  SITE_ERROR: "Sajten svarade med ett fel.",
  NOT_HTML: "Adressen pekar inte på en webbsida.",
  INVALID_EMAIL: "Det ser inte ut som en giltig e-postadress.",
  CONSENT_REQUIRED: "Du behöver godkänna att vi får kontakta dig.",
  RATE_LIMITED: "Du har gjort många granskningar på kort tid. Vänta en stund och försök igen.",
};
const fallbackError = "Något gick fel. Försök igen.";

const STEPS = [
  "Hämtar startsidan",
  "Läser robots.txt och sitemap",
  "Väljer undersidor",
  "Granskar upp till 10 sidor",
  "Kontrollerar SEO-grunderna",
  "Bedömer synlighet i AI-sök",
];

/** Talar om sin höjd för förälderfönstret, så en iframe på milou.se kan växa
 *  med innehållet i stället för att få en egen rullist. */
function useReportHeight() {
  useEffect(() => {
    if (window.parent === window) return;
    const post = () => window.parent.postMessage({ type: "milou-audit-height", height: document.documentElement.scrollHeight }, "*");
    const observer = new ResizeObserver(post);
    observer.observe(document.body);
    post();
    return () => observer.disconnect();
  }, []);
}

/** Gradienten målas på hela dokumentet, så att ytan under verktyget i en iframe
 *  som är högre än innehållet (min-height på milou.se) inte blir grå. */
function usePaintPage() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("bg-red-fade");
    root.style.backgroundAttachment = "fixed";
    root.style.backgroundRepeat = "no-repeat";
    // Roten har eget bakgrundslager, så bodyns grå färg måste bort.
    document.body.style.background = "transparent";
    return () => {
      root.classList.remove("bg-red-fade");
      root.style.backgroundAttachment = "";
      root.style.backgroundRepeat = "";
      document.body.style.background = "";
    };
  }, []);
}

export default function AuditTool({ demo = false }: { demo?: boolean }) {
  useReportHeight();
  usePaintPage();
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublicAuditResult | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !email.trim() || !consent || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    setStep(0);
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3500);
    try {
      const res = await fetch("/api/public/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ERRORS[data.error] ?? fallbackError);
      else setResult(data);
    } catch {
      setError(fallbackError);
    } finally {
      if (timer.current) clearInterval(timer.current);
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center text-white">
      {demo && (
        <p className="bg-gray-900 text-peach text-xs font-bold text-center px-4 py-2">
          Demoläge — granskningen är skarp, men inga e-postadresser sparas.
        </p>
      )}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <h1 className="text-center text-3xl sm:text-5xl font-bold leading-tight">
          Hur synlig är din sajt
          <br />
          i Google och i AI-sök?
        </h1>
        <p className="mt-8 mx-auto text-center text-white/90 text-base sm:text-lg max-w-xl">
          Ange en webbadress så granskar vi sidan och ger den ett betyg från 1 till 10 — både för klassisk SEO och för
          synlighet i ChatGPT, Claude, Perplexity och Googles AI-svar.
        </p>

        <form onSubmit={run} className="mt-8 space-y-3">
          <div>
            <label htmlFor="audit-url" className="sr-only">
              Webbadress
            </label>
            <input
              id="audit-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="dinsajt.se"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={running}
              className="w-full bg-white text-gray-900 border-2 border-white px-4 py-3 text-lg outline-none focus:border-gray-900 disabled:bg-gray-100"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="audit-email" className="sr-only">
              E-postadress
            </label>
            <input
              id="audit-email"
              type="email"
              autoComplete="email"
              placeholder="din@epost.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={running}
              className="flex-1 bg-white text-gray-900 border-2 border-white px-4 py-3 text-lg outline-none focus:border-gray-900 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={running || !url.trim() || !email.trim() || !consent}
              className="bg-gray-900 hover:bg-black text-white font-bold px-6 py-3 text-lg disabled:opacity-50 transition-colors"
            >
              {running ? "Granskar…" : "Granska"}
            </button>
          </div>
          <label className="flex items-start justify-center gap-2 text-sm text-white/90 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={running}
              className="mt-1 accent-milou-500"
            />
            <span>Jag godkänner att Milou kontaktar mig om resultatet och hur vi kan hjälpa till.</span>
          </label>
        </form>

        {running && (
          <ol className="mt-8 space-y-2 text-sm" aria-live="polite">
            {STEPS.map((label, i) => (
              <li key={label} className={`flex items-center justify-center gap-2 ${i > step ? "text-white/50" : "text-white"}`}>
                {i < step ? <Check className="w-4 h-4" /> : i === step ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="w-4 h-4" />}
                {label}
              </li>
            ))}
          </ol>
        )}

        {error && (
          <p role="alert" className="mt-6 flex items-start justify-center gap-2 bg-white text-milou-600 p-3 font-bold">
            <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        {result && <Result result={result} />}
      </div>
    </div>
  );
}

function Result({ result }: { result: PublicAuditResult }) {
  const groups = [
    { key: "seo" as const, label: "SEO", hint: "Synlighet i Google", score: result.seoScore },
    { key: "geo" as const, label: "GEO", hint: "Synlighet i AI-sök", score: result.geoScore },
  ];

  return (
    <section className="mt-12" aria-label="Resultat">
      <div className="milou-plate bg-gray-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10">
        <div>
          <p className="text-sm text-gray-400">
            {result.host}
            {result.pages.length > 1 && ` · ${result.pages.length} sidor granskade`}
          </p>
          <p className="mt-1 text-7xl font-bold tabular-nums leading-none">
            {result.score}
            <span className="text-3xl text-gray-500">/10</span>
          </p>
        </div>
        <div className="flex gap-8">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-3xl font-bold tabular-nums">
                {g.score}
                <span className="text-base text-gray-500">/10</span>
              </p>
              <p className="text-sm font-bold">{g.label}</p>
              <p className="text-xs text-gray-400">{g.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <Details result={result} />

    </section>
  );
}

function Details({ result }: { result: PublicAuditResult }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-12 bg-gray-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="font-bold text-lg">Vill du se vad som måste göras?</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="audit-details"
          className="bg-white text-gray-900 font-bold px-5 py-2.5 hover:bg-peach transition-colors text-center"
        >
          {open ? "Dölj brister" : "Se brister"}
        </button>
      </div>

      {open && (
        <CheckGroups
          id="audit-details"
          checks={result.checks}
          seoScore={result.seoScore}
          geoScore={result.geoScore}
          className="mt-6 bg-white text-gray-900 p-6 sm:p-8"
        />
      )}
    </>
  );
}
