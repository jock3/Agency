"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { composeAd, ensureFont, loadImage, remFontFamily, type ZoneReport } from "@/lib/ads/compose";
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

/** Komponering för hand (steg 4). Samma renderare används senare när AI:n väljer och skriver (steg 5). */
export default function Composer({ photos, templates }: { photos: Photo[]; templates: Template[] }) {
  const [photoId, setPhotoId] = useState(photos[0].id);
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [format, setFormat] = useState<AdFormat>("1:1");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<ZoneReport[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const run = useRef(0);

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

  function download() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return setError("Annonsen gick inte att spara som bild.");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `annons-${activeFormat.replace(":", "x")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  }

  const overflow = template.layout.zones.filter((z) => reportOf.get(z.id)?.fits === false);
  const size = FORMAT_SIZE[activeFormat];

  return (
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
          <select id="tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={field}>
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
                  <span>
                    {text.length} av {z.maxChars} tecken
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
  );
}
