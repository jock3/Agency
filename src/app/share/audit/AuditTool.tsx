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
function useReportHeight(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (window.parent === window || !el) return;
    // Mät innehållet, inte dokumentet. Roten har min-h-screen, alltså iframens höjd, så dokumentets
    // höjd krymper aldrig när innehållet blir mindre (t.ex. när bristerna döljs).
    const children = Array.from(el.children);
    const post = () => {
      const height = Math.ceil(children.reduce((h, c) => h + c.getBoundingClientRect().height, 0));
      window.parent.postMessage({ type: "milou-audit-height", height }, "*");
    };
    const observer = new ResizeObserver(post);
    children.forEach((c) => observer.observe(c));
    post();
    return () => observer.disconnect();
  }, [root]);
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
  const rootRef = useRef<HTMLDivElement>(null);
  useReportHeight(rootRef);
  usePaintPage();
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublicAuditResult | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (running) return;
    // Safari tabbar som standard bara mellan textfält och hoppar över kryssrutor och knappar.
    // Därför går Enter i fältet att använda hela vägen: saknas något flyttas fokus dit och det sägs vad som ska göras.
    if (!url.trim()) {
      setError("Fyll i webbadressen.");
      urlRef.current?.focus();
      return;
    }
    if (!email.trim()) {
      setError("Fyll i din e-postadress.");
      emailRef.current?.focus();
      return;
    }
    if (!consent) {
      setError("Godkänn lagringen av dina uppgifter: tryck mellanslag för att kryssa i rutan och sedan Enter för att granska.");
      consentRef.current?.focus();
      return;
    }
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
    <div ref={rootRef} className="audit-public min-h-screen flex flex-col justify-center text-white">
      {demo && (
        <p className="bg-gray-900 text-peach text-xs font-bold text-center px-4 py-2">
          Demoläge — granskningen är skarp, men inga e-postadresser sparas.
        </p>
      )}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <p className="milou-kicker !text-white w-full justify-center">SEO/GEO-audit</p>
        <h1 className="milou-display-sm mt-4 text-center">
          Hur synlig är din sajt
          <br />
          i Google och i AI-sök?
        </h1>
        <p className="mt-8 mx-auto text-center text-white/90 text-base sm:text-lg max-w-xl">
          Ange en webbadress så granskar vi sidan och ger den ett betyg från 1 till 10 — både för klassisk SEO och för
          synlighet i ChatGPT, Claude, Perplexity och Googles AI-svar.
        </p>

        <form ref={formRef} onSubmit={run} className="mt-8 space-y-3">
          <div>
            <label htmlFor="audit-url" className="sr-only">
              Webbadress
            </label>
            <input
              id="audit-url"
              ref={urlRef}
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="dinsajt.se"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={running}
              className="w-full bg-white text-gray-900 border-2 border-white px-4 py-3 text-lg focus:border-gray-900 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label htmlFor="audit-email" className="sr-only">
              E-postadress
            </label>
            <input
              id="audit-email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              placeholder="din@epost.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={running}
              className="w-full bg-white text-gray-900 border-2 border-white px-4 py-3 text-lg focus:border-gray-900 disabled:bg-gray-100"
            />
          </div>
          {/*
            Kryssrutan och knappen är div-element med role och tabIndex, inte <input>/<button>.
            Safari tabbar som standard inte till riktiga formulärkontroller (bara textfält), men väl till element med tabindex.
          */}
          <div className="flex items-start justify-center gap-2 text-sm text-white/90">
            <div
              ref={consentRef}
              role="checkbox"
              aria-checked={consent}
              aria-labelledby="audit-consent-text"
              tabIndex={running ? -1 : 0}
              onClick={() => !running && setConsent((c) => !c)}
              onKeyDown={(e) => {
                if (e.key === " ") {
                  e.preventDefault();
                  if (!running) setConsent((c) => !c);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              className={`mt-0.5 w-5 h-5 shrink-0 border-2 flex items-center justify-center cursor-pointer ${
                consent ? "bg-milou-500 border-milou-500 text-white" : "bg-transparent border-white"
              }`}
            >
              {consent && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            </div>
            <span
              id="audit-consent-text"
              onClick={(e) => {
                if (!running && !(e.target as HTMLElement).closest("a")) setConsent((c) => !c);
              }}
              className="cursor-pointer"
            >
              Jag godkänner att Milou lagrar mina uppgifter och kontaktar mig om resultatet, enligt Milous{" "}
              <a
                href="https://milou.se/intergritetspolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                integritetspolicy
              </a>
              .
            </span>
          </div>
          {/* Riktig skickaknapp, dold: behövs för att Enter i textfälten ska skicka formuläret. */}
          <button type="submit" tabIndex={-1} aria-hidden="true" disabled={running} className="sr-only">
            Granska
          </button>
          <div
            role="button"
            tabIndex={running ? -1 : 0}
            aria-disabled={running}
            onClick={() => formRef.current?.requestSubmit()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            className={`milou-btn milou-btn-beige w-full !text-lg !py-4 cursor-pointer ${running ? "opacity-50" : ""}`}
          >
            {running ? "Granskar…" : "Granska"}
          </div>
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
  const section = useRef<HTMLElement>(null);
  // Flytta fokus till resultatet när det visas, så att tangentbords- och skärmläsaranvändare hamnar rätt.
  useEffect(() => {
    section.current?.focus();
  }, []);
  const groups = [
    { key: "seo" as const, label: "SEO", hint: "Synlighet i Google", score: result.seoScore },
    { key: "geo" as const, label: "GEO", hint: "Synlighet i AI-sök", score: result.geoScore },
  ];

  return (
    <section ref={section} tabIndex={-1} className="mt-12 focus:outline-none" aria-label="Resultat">
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
