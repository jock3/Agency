"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { composeAd, ensureFont, loadImage, remFontFamily, type ZoneReport } from "@/lib/ads/compose";
import { ADS_ERRORS, FALLBACK } from "../../errors";
import { FORMATS, FORMAT_SIZE, ROLE_NAMES, type AdFormat, type TemplateLayout } from "@/lib/ads/layout";

const field =
  "w-full border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500";

interface Photo {
  id: string;
  url: string;
  label: string;
}
interface Template {
  id: string;
  url: string;
  label: string;
  layout: TemplateLayout;
}

const saveBlob = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/** Komponering: för hand (steg 4), med AI-förslag (steg 5), byte och nedladdning (steg 6) och nya bilder från ArtCraft (steg 7). */
export default function Composer({ companyId, photos: initialPhotos, templates }: { companyId: string; photos: Photo[]; templates: Template[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [photoId, setPhotoId] = useState(initialPhotos[0].id);
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [format, setFormat] = useState<AdFormat>("1:1");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<ZoneReport[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [aiFormat, setAiFormat] = useState<AdFormat>(FORMATS.find((f) => templates.some((t) => t.layout.placements[f])) ?? "1:1");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [dlBusy, setDlBusy] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [genProgress, setGenProgress] = useState<number | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genNote, setGenNote] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const run = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const aiFormats = FORMATS.filter((f) => templates.some((t) => t.layout.placements[f]));

  const photo = photos.find((p) => p.id === photoId)!;
  const template = templates.find((t) => t.id === templateId)!;
  const formats = FORMATS.filter((f) => template.layout.placements[f]);
  const activeFormat: AdFormat = formats.includes(format) ? format : formats[0];

  // Ritar om när något ändras. `run` gör att ett långsamt tidigare ritande inte skriver över ett nyare.
  useEffect(() => {
    const id = ++run.current;
    setBusy(true);
    (async () => {
      try {
        const fontFamily = remFontFamily();
        const [img, tpl] = await Promise.all([loadImage(photo.url), loadImage(template.url), ensureFont(fontFamily)]);
        if (id !== run.current || !canvas.current) return;
        setReports(composeAd(canvas.current, { format: activeFormat, photo: img, template: tpl, layout: template.layout, texts, fontFamily }));
        setError(null);
      } catch {
        if (id === run.current) setError("Bilden eller mallen gick inte att läsa in. Ladda om sidan och försök igen.");
      } finally {
        if (id === run.current) setBusy(false);
      }
    })();
  }, [photo.url, template, activeFormat, texts]);

  const reportOf = useMemo(() => new Map(reports.map((r) => [r.id, r])), [reports]);

  /** Byter mall och tar med texterna: rubrik blir rubrik, undertext blir undertext, men bara där den nya ytan är tom. */
  function changeTemplate(newId: string) {
    const to = templates.find((t) => t.id === newId);
    if (!to) return;
    setTexts((t) => {
      const next = { ...t };
      const seen = new Map<string, number>();
      to.layout.zones.forEach((z) => {
        const n = seen.get(z.role) ?? 0;
        seen.set(z.role, n + 1);
        const src = template.layout.zones.filter((f) => f.role === z.role)[n];
        if (src && !(next[z.id] ?? "").trim() && (t[src.id] ?? "").trim()) next[z.id] = t[src.id];
      });
      return next;
    });
    setTemplateId(newId);
  }

  /** Claude väljer bild och mall och skriver texten. Förslaget laddas in i samma väljare som man använder för hand. */
  async function suggest() {
    setAiBusy(true);
    setAiError(null);
    setReason(null);
    try {
      const res = await fetch(`/api/annonser/companies/${companyId}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, format: aiFormat }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setAiError(ADS_ERRORS[data.error] ?? FALLBACK);
      if (!photos.some((p) => p.id === data.photoId) || !templates.some((t) => t.id === data.templateId)) return setAiError(ADS_ERRORS.AI_FAILED);
      setPhotoId(data.photoId);
      setTemplateId(data.templateId);
      setFormat(aiFormat);
      setTexts(data.texts ?? {});
      setReason(typeof data.reason === "string" ? data.reason : null);
    } catch {
      setAiError(FALLBACK);
    } finally {
      setAiBusy(false);
    }
  }

  function download() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return setError("Annonsen gick inte att spara som bild.");
      saveBlob(blob, `annons-${activeFormat.replace(":", "x")}.png`);
    }, "image/png");
  }

  /** Alla format som mallen har en placering i, med samma bild och text. */
  async function downloadAll() {
    setDlBusy(true);
    try {
      const fontFamily = remFontFamily();
      const [img, tpl] = await Promise.all([loadImage(photo.url), loadImage(template.url), ensureFont(fontFamily)]);
      for (const f of formats) {
        const c = document.createElement("canvas");
        composeAd(c, { format: f, photo: img, template: tpl, layout: template.layout, texts, fontFamily });
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
        if (blob) saveBlob(blob, `annons-${f.replace(":", "x")}.png`);
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch {
      setError("Annonserna gick inte att spara som bilder.");
    } finally {
      setDlBusy(false);
    }
  }

  /** Beställer en ny bild hos ArtCraft, väntar ut jobbet och lägger den färdiga bilden i bildbanken (servern sparar den). */
  async function generate() {
    setGenBusy(true);
    setGenError(null);
    setGenNote(null);
    setGenProgress(0);
    const base = `/api/annonser/companies/${companyId}/generate`;
    try {
      const start = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: genPrompt, format: aiFormat }) });
      const s = await start.json().catch(() => ({}));
      if (!start.ok) return setGenError(ADS_ERRORS[s.error] ?? FALLBACK);
      const deadline = Date.now() + 5 * 60_000;
      let failures = 0;
      while (alive.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        let d: { state?: string; progress?: number; error?: string; asset?: { id: string; url: string | null; label: string } };
        let ok: boolean;
        try {
          const res = await fetch(`${base}/${s.token}?prompt=${encodeURIComponent(genPrompt)}`, { cache: "no-store" });
          ok = res.ok;
          d = await res.json().catch(() => ({}));
          failures = 0;
        } catch {
          if (++failures >= 3) return setGenError(FALLBACK);
          continue;
        }
        if (!ok) return setGenError((d.error && ADS_ERRORS[d.error]) || FALLBACK);
        if (d.state === "running") {
          setGenProgress(d.progress ?? 0);
          continue;
        }
        if (d.state === "failed") return setGenError("ArtCraft kunde inte skapa bilden. Försök igen med en annan beskrivning.");
        if (d.state === "done" && d.asset?.url) {
          const asset = { id: d.asset.id, url: d.asset.url, label: d.asset.label };
          setPhotos((list) => (list.some((p) => p.id === asset.id) ? list : [asset, ...list]));
          setPhotoId(asset.id);
          setGenNote("Bilden sparades i bildbanken och är vald.");
          return;
        }
        return setGenError(FALLBACK);
      }
      if (alive.current) setGenError("Det tog för lång tid. Försök igen om en stund.");
    } catch {
      setGenError(FALLBACK);
    } finally {
      if (alive.current) {
        setGenBusy(false);
        setGenProgress(null);
      }
    }
  }

  const overflow = template.layout.zones.filter((z) => reportOf.get(z.id)?.fits === false);
  const size = FORMAT_SIZE[activeFormat];

  return (
    <>
    <section className="mt-6 bg-white p-4" aria-label="AI-förslag">
      <h3 className="font-bold text-sm flex items-center gap-1.5">
        <Sparkles className="w-4 h-4" aria-hidden /> Låt AI föreslå annonsen
      </h3>
      <label htmlFor="msg" className="text-sm block mt-2 mb-1">
        Budskap <span className="text-gray-600">– till exempel &quot;20 % på alla vinterdäck, gäller till söndag&quot;</span>
      </label>
      <textarea id="msg" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} className={field} />
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <div role="group" aria-label="Format för förslaget" className="flex border border-gray-300 bg-white">
          {aiFormats.map((f) => (
            <button
              key={f}
              aria-pressed={aiFormat === f}
              onClick={() => setAiFormat(f)}
              className={`px-3 py-2 text-sm font-bold ${aiFormat === f ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => void suggest()}
          disabled={aiBusy || !message.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white px-4 py-2"
        >
          {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Sparkles className="w-4 h-4" aria-hidden />}
          {aiBusy ? "AI väljer…" : "Föreslå annons"}
        </button>
      </div>
      <p role="alert" className="text-sm text-milou-600 mt-2 empty:hidden">
        {aiError}
      </p>
      <p role="status" className="text-sm text-gray-700 mt-2 empty:hidden">
        {reason && `Varför: ${reason}`}
      </p>
    </section>
    <section className="mt-4 bg-white p-4" aria-label="Ny bild">
      <h3 className="font-bold text-sm flex items-center gap-1.5">
        <ImagePlus className="w-4 h-4" aria-hidden /> Ingen bild som passar? Skapa en ny
      </h3>
      <label htmlFor="gen" className="text-sm block mt-2 mb-1">
        Beskriv bilden <span className="text-gray-600">– till exempel &quot;kvinna i vinterjacka på en snöig gata, dagsljus&quot;. Bilden får aldrig någon text.</span>
      </label>
      <textarea id="gen" rows={2} maxLength={500} value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} className={field} />
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <button
          onClick={() => void generate()}
          disabled={genBusy || !genPrompt.trim()}
          className="flex items-center gap-1.5 text-sm font-bold bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white px-4 py-2"
        >
          {genBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <ImagePlus className="w-4 h-4" aria-hidden />}
          {genBusy ? `Skapar bilden${genProgress ? ` (${genProgress} %)` : "…"}` : `Skapa bild i ${aiFormat}`}
        </button>
        <span className="text-xs text-gray-600">Använder formatet ovan. Kostar ArtCraft-krediter (cirka 8 US cent per bild) och sparas i bildbanken.</span>
      </div>
      <p role="alert" className="text-sm text-milou-600 mt-2 empty:hidden">
        {genError}
      </p>
      <p role="status" className="text-sm text-gray-700 mt-2 empty:hidden">
        {genNote}
      </p>
    </section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <section className="bg-white p-4" aria-label="Bild">
          <h3 className="font-bold text-sm mb-2">Bild</h3>
          <ul className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
            {photos.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setPhotoId(p.id)}
                  aria-pressed={p.id === photoId}
                  aria-label={p.label}
                  title={p.label}
                  className={`block w-full aspect-square bg-gray-100 outline-offset-2 ${p.id === photoId ? "outline outline-2 outline-milou-500" : "hover:outline hover:outline-2 hover:outline-gray-400"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white p-4" aria-label="Mall och format">
          <label htmlFor="tpl" className="font-bold text-sm block mb-1">
            Mall
          </label>
          <select id="tpl" value={templateId} onChange={(e) => changeTemplate(e.target.value)} className={field}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <div role="tablist" aria-label="Format" className="flex border border-gray-300 bg-white mt-3 w-fit">
            {formats.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={activeFormat === f}
                onClick={() => setFormat(f)}
                className={`px-3 py-2 text-sm font-bold ${activeFormat === f ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                {f}
              </button>
            ))}
          </div>
          {formats.length < FORMATS.length && <p className="text-xs text-gray-600 mt-2">Mallen har bara placering i {formats.join(", ")}.</p>}
        </section>

        <section className="bg-white p-4 flex flex-col gap-2" aria-label="Text">
          <h3 className="font-bold text-sm">Text</h3>
          {template.layout.zones.map((z, i) => {
            const text = texts[z.id] ?? "";
            const r = reportOf.get(z.id);
            const id = `t-${z.id}`;
            return (
              <div key={z.id} className="flex flex-col gap-1">
                <label htmlFor={id} className="text-sm font-bold">
                  {ROLE_NAMES[z.role]} {template.layout.zones.length > 1 ? `(yta ${i + 1})` : ""}
                  {z.hint && <span className="font-normal text-gray-600"> – {z.hint}</span>}
                </label>
                <textarea
                  id={id}
                  rows={z.role === "rubrik" ? 2 : 1}
                  maxLength={z.maxChars}
                  value={text}
                  onChange={(e) => setTexts((t) => ({ ...t, [z.id]: e.target.value }))}
                  className={field}
                />
                <p className="text-xs text-gray-600 flex justify-between">
                  <span className={text.length > z.maxChars ? "text-milou-600 font-bold" : undefined}>
                    {text.length} av {z.maxChars} tecken{text.length > z.maxChars ? ": för långt för den här ytan, korta ner" : ""}
                  </span>
                  {r && <span>Textstorlek {Math.round(r.fontSize)} px</span>}
                </p>
              </div>
            );
          })}
        </section>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={download}
            disabled={busy || !!error}
            className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-40 text-white px-4 py-2"
          >
            <Download className="w-4 h-4" aria-hidden /> Ladda ner PNG ({size.w}×{size.h})
          </button>
          {formats.length > 1 && (
            <button
              onClick={() => void downloadAll()}
              disabled={busy || dlBusy || !!error}
              className="flex items-center gap-1.5 text-sm font-bold border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 px-4 py-2"
            >
              {dlBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Download className="w-4 h-4" aria-hidden />}
              Alla format ({formats.join(", ")})
            </button>
          )}
          {busy && <Loader2 className="w-4 h-4 animate-spin text-gray-600" aria-label="Ritar annonsen" />}
        </div>
        <p role="alert" className="text-sm text-milou-600 mb-2 empty:hidden">
          {error}
        </p>
        {(overflow.length > 0 || reports.some((r) => r.fits && r.small)) && (
          <ul className="flex flex-col gap-1.5 mb-3" aria-label="Varningar">
            {overflow.map((z) => (
              <li key={z.id} className="flex gap-1.5 text-sm bg-amber-50 border border-amber-300 px-2.5 py-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden />
                {ROLE_NAMES[z.role]}: texten ryms inte i ytan ens på minsta storlek. Korta ner den.
              </li>
            ))}
            {template.layout.zones
              .filter((z) => reportOf.get(z.id)?.fits && reportOf.get(z.id)?.small)
              .map((z) => (
                <li key={z.id} className="flex gap-1.5 text-sm bg-amber-50 border border-amber-300 px-2.5 py-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden />
                  {ROLE_NAMES[z.role]}: texten har krympts mycket för att få plats. Kortare text blir lättare att läsa.
                </li>
              ))}
          </ul>
        )}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Förhandsvisning av annonsen i ${activeFormat}`}
          className="bg-gray-200 block mx-auto max-w-full"
          style={{ width: `min(100%, calc(75vh * ${size.w / size.h}))`, aspectRatio: `${size.w} / ${size.h}` }}
        />
      </div>
    </div>
    </>
  );
}
