"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { buildPlatform, decodeFile, guessMapping, guessPlatform, parseCsv, type Mapping, type Table } from "@/lib/report/csv";
import { MAX_PLATFORMS, type Section } from "@/lib/report/doc";
import { fmtPlain, isNum, KPIS, neededRaw, RAW_KEYS, sortKpis, type RawKey } from "@/lib/report/kpis";
import type { Ops } from "./Inspector";
import { PLATFORM_PRESETS } from "./Inspector";

type Stats = Extract<Section, { type: "stats" }>;

const MAX_BYTES = 5 * 1024 * 1024;
const field = "border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-milou-500";

/**
 * Importera en plattform med annonser från en exportfil. Kolumnerna gissas
 * utifrån rubrikerna och kan ändras; förhandsvisningen visar vad som kommer in
 * innan något ändras i rapporten. Importen går att ångra.
 */
export default function ImportDialog({ sec, ops, onClose }: { sec: Stats; ops: Ops; onClose: () => void }) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const need = neededRaw(sortKpis(sec.kpis));
  // Mått som tabellen använder först, sedan resten.
  const metricOrder: RawKey[] = [...need, ...RAW_KEYS.filter((k) => !need.includes(k))];

  async function readFile(f: File) {
    setError(null);
    if (f.size > MAX_BYTES) return setError("Filen är större än 5 MB. Exportera färre rader, till exempel utan uppdelning per dag.");
    const text = decodeFile(new Uint8Array(await f.arrayBuffer()));
    const t = parseCsv(text);
    if (!t || !t.rows.length) return setError("Filen kunde inte läsas som en tabell. Välj en CSV-export från annonsverktyget.");
    setFilename(f.name);
    setTable(t);
    setMapping(guessMapping(t.headers));
    setPlatform(guessPlatform(f.name, t.headers));
  }

  const result = useMemo(() => (table && mapping ? buildPlatform(table, mapping, platform || "Plattform", () => Math.random().toString(36).slice(2, 10)) : null), [table, mapping, platform]);
  const existing = sec.platforms.find((p) => p.name.trim().toLowerCase() === platform.trim().toLowerCase() && platform.trim());
  const full = !existing && sec.platforms.length >= MAX_PLATFORMS;

  function doImport() {
    if (!result || !platform.trim() || full) return;
    const imported = { ...result.platform, id: ops.newId(), ads: result.platform.ads.map((a) => ({ ...a, id: ops.newId() })) };
    ops.undoable(`${platform.trim()} importerades från ${filename}.`, () =>
      ops.editStats(sec.id, (s) => {
        const i = s.platforms.findIndex((p) => p.name.trim().toLowerCase() === platform.trim().toLowerCase());
        if (i >= 0) s.platforms[i] = imported;
        else s.platforms.push(imported);
      }),
    );
    onClose();
  }

  const select = (label: string, value: number | null, onChange: (v: number | null) => void, hint?: string) => (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-gray-600">
        {label} {hint && <span className="font-normal">{hint}</span>}
      </span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className={field}>
        <option value="">— ingen —</option>
        {table?.headers.map((h, i) => (
          <option key={i} value={i}>{h}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center overflow-y-auto p-4 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white w-full max-w-3xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id={titleId} className="font-bold text-lg">Importera från fil · {sec.title || "Namnlös kampanj"}</h2>
          <button type="button" onClick={onClose} aria-label="Stäng" className="w-8 h-8 grid place-items-center text-gray-600 hover:text-gray-900">
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 h-9 px-3.5 border border-dashed border-gray-400 text-sm hover:border-milou-500 hover:text-milou-600"
            >
              <FileUp className="w-4 h-4" aria-hidden /> {table ? "Välj en annan fil" : "Välj fil (CSV)"}
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
              aria-label="Exportfil"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void readFile(f);
              }}
            />
            <p className="text-xs text-gray-600 mt-2">
              Exportera annonsrapporten som CSV från Meta, TikTok, LinkedIn, Google Ads eller Snapchat, med en rad per annons. Siffror på svenska och engelska fungerar.
            </p>
            {error && <p role="alert" className="text-sm text-milou-600 mt-2">{error}</p>}
          </div>

          {table && mapping && result && (
            <>
              <p className="text-sm text-gray-700">
                <b>{filename}</b>: {table.rows.length} rader{table.skippedPreamble ? `, ${table.skippedPreamble} rader ovanför rubrikerna hoppades över` : ""}.
              </p>

              <label className="flex flex-col gap-1 text-xs max-w-xs">
                <span className="font-semibold text-gray-600">Plattform</span>
                <input list="rp-import-platforms" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Till exempel Meta" className={field} />
                <datalist id="rp-import-platforms">{PLATFORM_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
              </label>
              {existing && <p className="text-xs text-milou-600 -mt-3">{existing.name} finns redan på sidan och ersätts av importen. Det går att ångra.</p>}
              {full && <p className="text-xs text-milou-600 -mt-3">Sidan har redan {MAX_PLATFORMS} plattformar, som är högsta antalet.</p>}

              <fieldset className="grid sm:grid-cols-2 gap-3">
                <legend className="text-sm font-bold mb-2">Kolumner</legend>
                {select("Annonsens namn", mapping.name, (v) => setMapping({ ...mapping, name: v }))}
                {metricOrder.map((k) =>
                  select(KPIS[k].name + (k === "spend" ? " (kr)" : ""), mapping.metrics[k], (v) => setMapping({ ...mapping, metrics: { ...mapping.metrics, [k]: v } }), need.includes(k) ? "· används i tabellen" : undefined),
                )}
              </fieldset>
              {mapping.metrics.conversions !== null && /resultat|results/i.test(table.headers[mapping.metrics.conversions] ?? "") && (
                <p className="text-xs text-gray-600 -mt-2">Kontrollera att &quot;{table.headers[mapping.metrics.conversions]}&quot; verkligen är konverteringar. I Meta beror resultatet på kampanjens mål.</p>
              )}

              <div>
                <p className="text-sm">
                  <b>{result.ads}</b> {result.ads === 1 ? "annons" : "annonser"}
                  {result.skipped ? ` · ${result.skipped} totalrader eller tomma rader hoppas över` : ""}
                  {result.merged ? ` · ${result.merged} annonser fanns på flera rader och slogs ihop (utan räckvidd)` : ""}
                  {result.reachFromTotal ? " · plattformens räckvidd hämtas från totalraden" : ""}
                  {result.badCells ? ` · ${result.badCells} celler kunde inte läsas som tal` : ""}
                  {result.dropped ? ` · ${result.dropped} annonser ryms inte (högst 40 per plattform)` : ""}
                </p>
                {result.ads > 0 && (
                  <div className="overflow-x-auto mt-2 border border-gray-200">
                    <table className="w-full text-xs tabular-nums">
                      <thead>
                        <tr className="text-left text-gray-600 border-b border-gray-200">
                          <th className="px-2 py-1.5 font-medium">Annons</th>
                          {metricOrder.filter((k) => mapping.metrics[k] !== null).map((k) => <th key={k} className="px-2 py-1.5 font-medium text-right">{KPIS[k].name}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {result.platform.ads.slice(0, 6).map((a) => (
                          <tr key={a.id} className="border-b border-gray-100">
                            <td className="px-2 py-1.5 max-w-[16rem] truncate">{a.name}</td>
                            {metricOrder.filter((k) => mapping.metrics[k] !== null).map((k) => <td key={k} className="px-2 py-1.5 text-right">{isNum(a.values[k]) ? fmtPlain(a.values[k] as number) : "–"}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.ads > 6 && <p className="text-xs text-gray-600 px-2 py-1.5">… och {result.ads - 6} till</p>}
                  </div>
                )}
                {result.ads === 0 && <p className="text-sm text-milou-600 mt-1">Inga annonser hittades. Välj kolumnen med annonsens namn och minst ett mått.</p>}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} className="h-9 px-3.5 border border-gray-300 bg-white text-sm hover:bg-gray-50">Avbryt</button>
          <button
            type="button"
            onClick={doImport}
            disabled={!result || result.ads === 0 || !platform.trim() || full}
            className="h-9 px-3.5 bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white text-sm font-bold"
          >
            {existing ? `Ersätt ${existing.name}` : "Importera"}
          </button>
        </div>
      </div>
    </div>
  );
}
