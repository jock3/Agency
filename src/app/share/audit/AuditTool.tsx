"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock, TriangleAlert, X } from "lucide-react";
import MilouLogo from "@/components/MilouLogo";
import type { AuditAction, PublicAuditResult, UnlockedAudit } from "@/lib/audit/types";

/** Dit "Boka ett samtal" leder. Byt mot kontaktsidan när verktyget går live. */
const CONTACT_URL = "https://milou.se";

const ERRORS: Record<string, string> = {
  INVALID_URL: "Det ser inte ut som en giltig webbadress. Prova till exempel milou.se.",
  BLOCKED_HOST: "Den adressen kan vi inte granska.",
  TIMEOUT: "Sajten svarade inte i tid. Prova igen om en stund.",
  NETWORK: "Vi kom inte åt sajten. Kontrollera adressen.",
  TOO_LARGE: "Sidan är för stor för att granskas.",
  TOO_MANY_REDIRECTS: "Sajten omdirigerar för många gånger.",
  SITE_ERROR: "Sajten svarade med ett fel.",
  NOT_HTML: "Adressen pekar inte på en webbsida.",
  RATE_LIMITED: "Du har gjort många granskningar på kort tid. Vänta en stund och försök igen.",
  INVALID_EMAIL: "Kontrollera e-postadressen.",
  CONSENT_REQUIRED: "Du behöver godkänna att vi kontaktar dig.",
};
const fallbackError = "Något gick fel. Försök igen.";

const STEPS = ["Hämtar sidan", "Läser robots.txt och sitemap", "Kontrollerar SEO-grunderna", "Bedömer synlighet i AI-sök"];

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

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-700";
  if (score >= 5) return "text-amber-600";
  return "text-milou-500";
}

export default function AuditTool({ demo = false }: { demo?: boolean }) {
  useReportHeight();
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublicAuditResult | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    setStep(0);
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1600);
    try {
      const res = await fetch("/api/public/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
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
    <div className="min-h-screen bg-white text-gray-900">
      {demo && (
        <p className="bg-gray-900 text-peach text-xs font-bold text-center px-4 py-2">
          Demoläge — granskningen är skarp, men inga e-postadresser sparas.
        </p>
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <MilouLogo className="h-5 w-auto text-milou-500 mb-10" />

        <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
          <span className="milou-band bg-peach">Hur synlig är din sajt</span>
          <br />
          <span className="milou-band bg-peach">i Google och i AI-sök?</span>
        </h1>
        <p className="mt-5 text-gray-600 text-base sm:text-lg max-w-xl">
          Ange en webbadress så granskar vi sidan och ger den ett betyg från 1 till 10 — både för klassisk SEO och för
          synlighet i ChatGPT, Claude, Perplexity och Googles AI-svar.
        </p>

        <form onSubmit={run} className="mt-8 flex flex-col sm:flex-row gap-3">
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
            className="flex-1 border-2 border-gray-900 px-4 py-3 text-lg outline-none focus:border-milou-500 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={running || !url.trim()}
            className="bg-milou-500 hover:bg-milou-600 text-white font-bold px-6 py-3 text-lg disabled:opacity-50 transition-colors"
          >
            {running ? "Granskar…" : "Granska"}
          </button>
        </form>

        {running && (
          <ol className="mt-8 space-y-2 text-sm" aria-live="polite">
            {STEPS.map((label, i) => (
              <li key={label} className={`flex items-center gap-2 ${i > step ? "text-gray-300" : "text-gray-700"}`}>
                {i < step ? <Check className="w-4 h-4 text-emerald-700" /> : i === step ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="w-4 h-4" />}
                {label}
              </li>
            ))}
          </ol>
        )}

        {error && (
          <p role="alert" className="mt-6 flex items-start gap-2 text-milou-600">
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
          <p className="text-sm text-gray-400">{result.host}</p>
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

      <Unlock id={result.id} />

      <div className="mt-14 grid sm:grid-cols-2 gap-10">
        {groups.map((g) => (
          <div key={g.key}>
            <h2 className="font-bold text-lg mb-3">
              {g.label} <span className={`tabular-nums ${scoreColor(g.score)}`}>{g.score}/10</span>
            </h2>
            <ul className="divide-y divide-gray-100 border-y border-gray-100">
              {result.checks
                .filter((c) => c.group === g.key)
                .map((c) => (
                  <li key={c.id} className="py-2.5 flex gap-2.5 text-sm">
                    {c.status === "pass" ? (
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" aria-label="Godkänd" />
                    ) : c.status === "warn" ? (
                      <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-label="Brist" />
                    ) : (
                      <X className="w-4 h-4 shrink-0 mt-0.5 text-milou-500" aria-label="Fel" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold">{c.label}</p>
                      <p className="text-gray-500 break-words">{c.detail}</p>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Unlock({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [advice, setAdvice] = useState<UnlockedAudit | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/audit/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ERRORS[data.error] ?? fallbackError);
      else setAdvice(data);
    } catch {
      setError(fallbackError);
    } finally {
      setBusy(false);
    }
  }

  if (advice) return <Actions advice={advice} />;

  return (
    <div className="mt-12 relative min-h-[360px]">
      {/* Suddiga platshållare antyder vad som finns bakom formuläret. */}
      <div aria-hidden className="space-y-3 blur-sm select-none pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-l-4 border-milou-500 bg-gray-50 p-4">
            <div className="h-4 w-2/3 bg-gray-300" />
            <div className="h-3 w-full bg-gray-200 mt-3" />
            <div className="h-3 w-5/6 bg-gray-200 mt-2" />
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="absolute inset-0 flex items-center justify-center p-2">
        <div className="bg-white border-2 border-gray-900 p-5 sm:p-6 w-full max-w-md shadow-plate-peach">
          <p className="flex items-center gap-2 font-bold text-lg">
            <Lock className="w-5 h-5 text-milou-500" />
            Få dina 3–5 viktigaste åtgärder
          </p>
          <p className="text-sm text-gray-600 mt-1">Skräddarsydda för sajten, direkt på skärmen.</p>
          <label htmlFor="audit-email" className="sr-only">
            E-post
          </label>
          <input
            id="audit-email"
            type="email"
            required
            autoComplete="email"
            placeholder="din@epost.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-4 w-full border-2 border-gray-900 px-3 py-2.5 outline-none focus:border-milou-500"
          />
          <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-milou-500" />
            Jag godkänner att Milou sparar min e-post och kontaktar mig om resultatet.
          </label>
          {error && (
            <p role="alert" className="mt-2 text-sm text-milou-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !email || !consent}
            className="mt-4 w-full bg-milou-500 hover:bg-milou-600 text-white font-bold py-2.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Skriver dina åtgärder…" : "Visa åtgärderna"}
          </button>
        </div>
      </form>
    </div>
  );
}

const IMPACT_STYLE: Record<AuditAction["impact"], string> = {
  hög: "bg-milou-500 text-white",
  medel: "bg-peach text-gray-900",
  låg: "bg-gray-100 text-gray-700",
};

function Actions({ advice }: { advice: UnlockedAudit }) {
  return (
    <div className="mt-12">
      <p className="text-lg">{advice.summary}</p>
      <ol className="mt-6 space-y-4">
        {advice.actions.map((a, i) => (
          <li key={i} className="border-l-4 border-milou-500 bg-gray-50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold tabular-nums text-milou-500">{i + 1}.</span>
              <h3 className="font-bold">{a.title}</h3>
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 ${IMPACT_STYLE[a.impact]}`}>{a.impact} effekt</span>
            </div>
            <p className="mt-2 text-gray-700">{a.description}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 bg-red-fade text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="font-bold text-lg">Vill du ha hjälp att genomföra dem?</p>
        <a href={CONTACT_URL} target="_top" className="bg-white text-gray-900 font-bold px-5 py-2.5 hover:bg-peach transition-colors text-center">
          Boka ett samtal med Milou
        </a>
      </div>
    </div>
  );
}
