"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, ImagePlus, Info, Loader2, Sparkles, X, XCircle } from "lucide-react";
import type { CheckStatus, SocialCheck } from "@/lib/social/checks";
import { MAX_IMAGES } from "@/lib/social/checks";
import { PLATFORMS, platformLabel } from "@/lib/social/platforms";
import { CATEGORIES, CATEGORY_LABEL, type CategoryStatus, type SocialReview } from "@/lib/social/categories";
import { clipCaption } from "@/lib/formatkoll/placements";

interface Picked {
  id: string;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  name: string;
}

interface Result {
  checks: SocialCheck[];
  review: SocialReview | null;
  score: number | null;
  error?: string;
}

const ERRORS: Record<string, string> = {
  BAD_PLATFORM: "Välj plattform.",
  EMPTY: "Lägg in minst en bild eller en text.",
  TOO_MANY_IMAGES: `Högst ${MAX_IMAGES} bilder åt gången.`,
  IMAGE_TOO_LARGE: "Bilderna är för stora tillsammans. Ta bort någon bild.",
  BAD_IMAGE: "En av bilderna gick inte att läsa. Prova en annan fil.",
  BAD_REQUEST: "Något gick fel med uppladdningen. Försök igen.",
  AI_DISABLED: "AI är avstängt, så bara de uppmätta kontrollerna visas. Lägg in ANTHROPIC_API_KEY i miljövariablerna.",
  AI_FAILED: "Kunde inte ta fram en granskning just nu. De uppmätta kontrollerna visas, försök igen om en stund.",
};
const FALLBACK = "Något gick fel. Försök igen.";

const MAX_SIDE = 1568;
const TARGET_BYTES = 600_000;

/** Förminskar bilden i webbläsaren: Vercel tar emot högst 4,5 MB per anrop, och
 *  Claude ändå skalar ner allt över ~1 500 px. Måtten för kontrollerna mäts på originalet. */
async function prepare(file: File): Promise<Picked> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("UNREADABLE");
  const { width, height } = bitmap;
  const toBlob = async (scale: number, quality: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("UNREADABLE");
    // Genomskinliga PNG:er blir annars svarta i JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  };
  let scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  let blob: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    blob = await toBlob(scale, quality);
    if (blob && blob.size <= TARGET_BYTES) break;
    if (quality === 0.55) {
      scale *= 0.8;
      blob = await toBlob(scale, 0.7);
    }
  }
  bitmap.close();
  if (!blob) throw new Error("UNREADABLE");
  return { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob), width, height, name: file.name };
}

export default function EvaluationTool({ aiOn }: { aiOn: boolean }) {
  const [platformId, setPlatformId] = useState(PLATFORMS[0].id);
  const [images, setImages] = useState<Picked[]>([]);
  const [text, setText] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const platform = PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0];

  // Förhandsvisningarna frigörs när sidan lämnas.
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

  async function addFiles(list: FileList | File[]) {
    const files = [...list].filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setError("Bara bilder går att lägga till här. Video granskas i Formatkoll.");
      return;
    }
    const room = MAX_IMAGES - imagesRef.current.length;
    if (room <= 0) {
      setError(`Högst ${MAX_IMAGES} bilder åt gången.`);
      return;
    }
    setError(files.length > room ? `Högst ${MAX_IMAGES} bilder åt gången. Resten lades inte till.` : null);
    setReading(true);
    const added: Picked[] = [];
    for (const f of files.slice(0, room)) {
      try {
        added.push(await prepare(f));
      } catch {
        setError("En bild gick inte att läsa. Använd JPG, PNG, WebP eller GIF.");
      }
    }
    setImages((prev) => [...prev, ...added]);
    setReading(false);
  }

  function removeImage(id: string) {
    setImages((prev) => {
      prev.filter((i) => i.id === id).forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return prev.filter((i) => i.id !== id);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || reading) return;
    if (images.length === 0 && !text.trim()) {
      setError(ERRORS.EMPTY);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("platform", platform.id);
      form.set("text", text);
      form.set("goal", goal);
      form.set("audience", audience);
      form.set("brand", brand);
      form.set("dims", JSON.stringify(images.map((i) => ({ width: i.width, height: i.height }))));
      images.forEach((i, n) => form.append("image", i.blob, `bild-${n + 1}.jpg`));
      const res = await fetch("/api/social/utvardering", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERRORS[data.error] ?? FALLBACK);
      } else {
        setResult(data as Result);
        // Resultatet hamnar under formuläret på smala skärmar.
        setTimeout(() => resultRef.current?.focus(), 50);
      }
    } catch {
      setError(FALLBACK);
    } finally {
      setBusy(false);
    }
  }

  const clip = platform.fullscreen ? null : clipCaption(text.trim(), platform.placement.clip);
  const input = "w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500";

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-10 lg:items-start">
      <form onSubmit={submit} className="space-y-6" aria-busy={busy}>
        <fieldset>
          <legend className="font-bold mb-2">Plattform</legend>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label
                key={p.id}
                className={`cursor-pointer px-3 py-2 text-sm font-bold border has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-milou-500 ${
                  p.id === platformId ? "bg-peach border-peach text-gray-900" : "bg-white border-gray-300 text-gray-700 hover:border-milou-500"
                }`}
              >
                <input type="radio" name="platform" value={p.id} checked={p.id === platformId} onChange={() => setPlatformId(p.id)} className="sr-only" />
                {platformLabel(p)}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-600">Passar bäst: {platform.ideal}.</p>
        </fieldset>

        <div>
          <p id="images-label" className="font-bold mb-2">
            Grafik <span className="font-normal text-gray-600">(upp till {MAX_IMAGES} bilder)</span>
          </p>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-8 border-2 border-dashed cursor-pointer text-sm text-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-milou-500 ${
              dragging ? "border-milou-500 bg-peach/30" : "border-gray-300 bg-white hover:border-milou-500"
            }`}
          >
            {reading ? <Loader2 className="w-6 h-6 animate-spin text-milou-500" aria-hidden /> : <ImagePlus className="w-6 h-6 text-milou-500" aria-hidden />}
            <span className="font-bold">{reading ? "Läser bilderna …" : "Välj bilder eller dra dem hit"}</span>
            <span className="text-xs text-gray-600">JPG, PNG, WebP eller GIF. Karuseller granskas i den ordning bilderna läggs till.</span>
            <input
              type="file"
              accept="image/*"
              multiple
              aria-labelledby="images-label"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {images.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-3">
              {images.map((img, n) => (
                <li key={img.id} className="relative bg-white border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl} alt={`Bild ${n + 1}`} className="w-full aspect-square object-cover" />
                  <p className="px-2 py-1 text-xs text-gray-600 tabular-nums">
                    {n + 1}. {img.width} × {img.height}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    aria-label={`Ta bort bild ${n + 1}`}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-gray-900/80 text-white hover:bg-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="post-text" className="font-bold block mb-2">
            {platform.textLabel}
          </label>
          <textarea id="post-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} className={`${input} resize-y`} placeholder="Skriv eller klistra in texten som ska publiceras." />
          <p className="mt-1 text-xs text-gray-600 tabular-nums">{[...text].length} tecken</p>
          {clip?.clipped && (
            <p className="mt-1 text-xs text-gray-600">
              Syns före ”mer” (ungefär): <span className="text-gray-900">{clip.text.replace(/… mer$/, "")}</span>
            </p>
          )}
        </div>

        <details className="bg-white border border-gray-200 px-4 py-3">
          <summary className="cursor-pointer font-bold">Brief (valfritt, ger bättre granskning)</summary>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="goal" className="text-sm font-bold block mb-1">Syfte</label>
              <input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={1000} className={input} placeholder="Till exempel: fler anmälningar till eventet" />
            </div>
            <div>
              <label htmlFor="audience" className="text-sm font-bold block mb-1">Målgrupp</label>
              <input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={1000} className={input} placeholder="Till exempel: marknadschefer i mellanstora bolag" />
            </div>
            <div>
              <label htmlFor="brand" className="text-sm font-bold block mb-1">Varumärke och tonläge</label>
              <input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={1000} className={input} placeholder="Till exempel: personliga, rakt på sak, ingen jargong" />
            </div>
          </div>
        </details>

        <div>
          <button
            type="submit"
            disabled={busy || reading}
            className="flex items-center gap-2 font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-5 py-3"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Sparkles className="w-5 h-5" aria-hidden />}
            {busy ? "Granskar …" : "Granska inlägget"}
          </button>
          {busy && <p className="mt-2 text-sm text-gray-600">Det tar ungefär en halv minut.</p>}
          {!aiOn && <p className="mt-2 text-sm text-gray-600">AI är avstängt här, så du får bara de uppmätta kontrollerna.</p>}
          <p role="alert" className="mt-2 text-sm text-milou-600 empty:hidden">
            {error}
          </p>
          <p className="mt-3 text-xs text-gray-600">Inget sparas: varken bilder, text eller resultat.</p>
        </div>
      </form>

      <section ref={resultRef} tabIndex={-1} aria-label="Resultat" className="mt-10 lg:mt-0 outline-none">
        {!result ? (
          <div className="bg-white border border-dashed border-gray-300 px-6 py-12 text-gray-600">
            <h2 className="font-display font-extrabold text-xl text-gray-900 mb-2">Så granskas inlägget</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm max-w-[60ch]">
              <li>Format, upplösning och textlängd mäts i kod mot vald plattform.</li>
              <li>Claude bedömer budskap och hook, grafik, text, plattformsanpassning, varumärke och tillgänglighet.</li>
              <li>Du får de viktigaste ändringarna, alternativa texter och förslag på bildbeskrivningar.</li>
              <li>Betyget räknas ut ur bedömningarna. Det är ett stöd för att jämföra utkast, inte en prognos för räckvidd.</li>
            </ul>
          </div>
        ) : (
          <ResultView result={result} />
        )}
      </section>
    </div>
  );
}

const STATUS_STYLE: Record<CategoryStatus, { label: string; cls: string }> = {
  bra: { label: "Bra", cls: "bg-[#C2EDE5] text-[#052D28]" },
  kan_forbattras: { label: "Kan bli bättre", cls: "bg-peach text-gray-900" },
  atgarda: { label: "Åtgärda", cls: "bg-milou-500 text-white" },
  ej_bedomd: { label: "Ej bedömd", cls: "bg-gray-200 text-gray-700" },
};

const CHECK_STYLE: Record<CheckStatus, { label: string; Icon: typeof Check; cls: string }> = {
  pass: { label: "Godkänt", Icon: CheckCircle2, cls: "text-[#0B6B5C]" },
  warn: { label: "Varning", Icon: AlertTriangle, cls: "text-[#9A5B00]" },
  fail: { label: "Fel", Icon: XCircle, cls: "text-milou-600" },
  info: { label: "Info", Icon: Info, cls: "text-gray-600" },
};

function ResultView({ result }: { result: Result }) {
  const { checks, review, score, error } = result;
  return (
    <div className="space-y-8">
      {error && <p className="bg-white border-l-4 border-milou-500 px-5 py-4 text-sm">{ERRORS[error] ?? FALLBACK}</p>}

      {review && (
        <div className="bg-gray-900 text-white px-6 py-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <h2 className="text-sm text-gray-400">Betyg</h2>
              <p className="font-display font-extrabold text-[64px] leading-none tabular-nums">
                {score ?? "–"}
                <span className="text-2xl text-gray-400">/10</span>
              </p>
            </div>
            <div className="grid grid-cols-10 gap-1 w-48 mb-3" role="img" aria-label={`Betyg ${score ?? "saknas"} av 10`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-3 ${score !== null && i < score ? "bg-peach" : "bg-gray-700"}`} />
              ))}
            </div>
          </div>
          {review.summary && <p className="mt-5 max-w-[70ch]">{review.summary}</p>}
          <p className="mt-4 text-xs text-gray-400 max-w-[70ch]">
            Bedömningarna är skrivna av AI och kan variera mellan körningar. Betyget räknas i kod ur dem och ur de uppmätta kontrollerna, med vikter satta för hand.
            Det säger inget om hur inlägget kommer att prestera.
          </p>
        </div>
      )}

      {review && review.topFixes.length > 0 && (
        <section>
          <h2 className="font-display font-extrabold text-2xl mb-3">Viktigast att ändra</h2>
          <ol className="bg-white divide-y divide-gray-100 list-decimal list-inside">
            {review.topFixes.map((f, i) => (
              <li key={i} className="px-5 py-3">
                {f}
              </li>
            ))}
          </ol>
        </section>
      )}

      {review && (
        <section>
          <h2 className="font-display font-extrabold text-2xl mb-3">Bedömning</h2>
          <ul className="space-y-3">
            {CATEGORIES.map((c) => {
              const r = review.categories.find((x) => x.id === c.id);
              if (!r) return null;
              const s = STATUS_STYLE[r.status];
              return (
                <li key={c.id} className="bg-white px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold">{CATEGORY_LABEL[c.id]}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 ${s.cls}`}>{s.label}</span>
                  </div>
                  {r.comment && <p className="mt-2 max-w-[75ch]">{r.comment}</p>}
                  {r.fix && (
                    <p className="mt-2 max-w-[75ch] text-sm">
                      <b>Gör så här:</b> {r.fix}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display font-extrabold text-2xl mb-1">Uppmätt</h2>
        <p className="text-sm text-gray-600 mb-3">Räknat i kod mot vald plattform. Gränserna är riktvärden.</p>
        {checks.length === 0 ? (
          <p className="text-sm text-gray-600">Inget att mäta utan bild eller text.</p>
        ) : (
          <ul className="bg-white divide-y divide-gray-100">
            {checks.map((c) => {
              const s = CHECK_STYLE[c.status];
              return (
                <li key={c.id} className="px-5 py-3 flex gap-3">
                  <s.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.cls}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="font-bold text-sm">
                      {c.label} <span className={`font-normal ${s.cls}`}>· {s.label}</span>
                    </p>
                    <p className="text-sm text-gray-700 max-w-[75ch]">{c.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {review && review.textAlternatives.length > 0 && (
        <section>
          <h2 className="font-display font-extrabold text-2xl mb-3">Alternativ text</h2>
          <ul className="space-y-3">
            {review.textAlternatives.map((t, i) => (
              <li key={i} className="bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-bold text-sm">{t.angle || `Alternativ ${i + 1}`}</h3>
                  <CopyButton value={t.text} />
                </div>
                <p className="mt-2 whitespace-pre-line max-w-[75ch]">{t.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-600">Skrivet av AI. Läs igenom och komplettera [fyll i] innan det används.</p>
        </section>
      )}

      {review && (review.altTexts.length > 0 || review.readTexts.length > 0) && (
        <section>
          <h2 className="font-display font-extrabold text-2xl mb-3">Bilderna</h2>
          <ul className="space-y-3">
            {Array.from(new Set([...review.altTexts, ...review.readTexts].map((x) => x.image)))
              .sort((a, b) => a - b)
              .map((n) => {
                const alt = review.altTexts.find((x) => x.image === n);
                const read = review.readTexts.find((x) => x.image === n);
                return (
                  <li key={n} className="bg-white px-5 py-4">
                    <h3 className="font-bold text-sm">Bild {n}</h3>
                    {alt && (
                      <div className="mt-2 flex items-start justify-between gap-4">
                        <p className="max-w-[75ch]">
                          <span className="text-sm text-gray-600">Förslag på bildbeskrivning: </span>
                          {alt.text || <span className="text-gray-600">(dekor, ingen beskrivning behövs)</span>}
                        </p>
                        {alt.text && <CopyButton value={alt.text} />}
                      </div>
                    )}
                    {read && (
                      <p className="mt-2 text-sm max-w-[75ch]">
                        <span className="text-gray-600">Text som AI:n läste i bilden: </span>
                        {read.text ? `”${read.text}”` : <span className="text-gray-600">ingen text</span>}
                      </p>
                    )}
                  </li>
                );
              })}
          </ul>
          <p className="mt-2 text-xs text-gray-600">Stämmer inte den upplästa texten har AI:n tolkat grafiken fel, och bedömningen av bilden är då osäker.</p>
        </section>
      )}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Urklipp nekas i vissa webbläsare; texten går ändå att markera.
    }
  }
  return (
    <button type="button" onClick={copy} className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-milou-500">
      {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />} {copied ? "Kopierat" : "Kopiera"}
    </button>
  );
}
