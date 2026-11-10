"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import {
  ALIGNS,
  FORMATS,
  FORMAT_SIZE,
  MAX_CHARS_LIMIT,
  MAX_ZONES,
  ROLES,
  ROLE_NAMES,
  VALIGNS,
  WEIGHTS,
  defaultPlacement,
  newZone,
  placementWarnings,
  readiness,
  safeInsets,
  type AdFormat,
  type TemplateLayout,
  type TextZone,
  type ZoneRole,
} from "@/lib/ads/layout";
import { ADS_ERRORS, FALLBACK } from "../../../errors";

const field =
  "w-full border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-milou-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const ALIGN_NAMES = { left: "Vänster", center: "Mitten", right: "Höger" } as const;
const VALIGN_NAMES = { top: "Överkant", middle: "Mitten", bottom: "Nederkant" } as const;

type Drag =
  | { kind: "zone-move" | "zone-resize"; id: string; startX: number; startY: number; orig: TextZone }
  | { kind: "place-move"; startX: number; startY: number; ox: number; oy: number }
  | null;

/**
 * Två vyer på samma layout:
 *  - Textytor: mallen i egen storlek, dra och dra i hörnet för att markera ytor.
 *  - Placering: bilden i valt format, dra mallen dit den ska sitta, med skyddszoner.
 * Allt är andelar (se lib/ads/layout.ts), så vyerna visar samma data.
 */
export default function LayoutEditor({
  companyId,
  assetId,
  name,
  imageUrl,
  initialAspect,
  initial,
}: {
  companyId: string;
  assetId: string;
  name: string;
  imageUrl: string;
  initialAspect: number | null;
  initial: TemplateLayout;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<TemplateLayout>(initial);
  const [saved, setSaved] = useState<TemplateLayout>(initial);
  const [aspect, setAspect] = useState<number>(initialAspect ?? 2);
  const [view, setView] = useState<"zones" | "placement">("zones");
  const [format, setFormat] = useState<AdFormat>("1:1");
  const [selected, setSelected] = useState<string | null>(initial.zones[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const drag = useRef<Drag>(null);
  const stage = useRef<HTMLDivElement>(null);

  const dirty = useMemo(() => JSON.stringify(layout) !== JSON.stringify(saved), [layout, saved]);
  const status = readiness(layout);
  const zone = layout.zones.find((z) => z.id === selected) ?? null;
  const placement = layout.placements[format];
  const warnings = useMemo(() => placementWarnings(layout, format, aspect), [layout, format, aspect]);

  // Varna innan man lämnar sidan med osparade ändringar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const updateZone = useCallback((id: string, patch: Partial<TextZone>) => {
    setLayout((l) => ({ ...l, zones: l.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));
    setNote(null);
  }, []);

  function addZone(role: ZoneRole) {
    if (layout.zones.length >= MAX_ZONES) return;
    const z = newZone(role);
    setLayout((l) => ({ ...l, zones: [...l.zones, z] }));
    setSelected(z.id);
    setView("zones");
    setNote(null);
  }

  function removeZone(id: string) {
    setLayout((l) => ({ ...l, zones: l.zones.filter((z) => z.id !== id) }));
    setSelected((cur) => (cur === id ? layout.zones.find((z) => z.id !== id)?.id ?? null : cur));
    setNote(null);
  }

  function setPlacement(p: { x: number; y: number; w: number } | null) {
    setLayout((l) => {
      const placements = { ...l.placements };
      if (p) placements[format] = p;
      else delete placements[format];
      return { ...l, placements };
    });
    setNote(null);
  }

  // ----- dra och släpp (pekare, funkar med mus och touch) -----

  function begin(e: React.PointerEvent, d: NonNullable<Drag>) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = d;
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    const box = stage.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = (e.clientX - d.startX) / box.width;
    const dy = (e.clientY - d.startY) / box.height;
    if (d.kind === "zone-move") {
      updateZone(d.id, { x: clamp(d.orig.x + dx, 0, 1 - d.orig.w), y: clamp(d.orig.y + dy, 0, 1 - d.orig.h) });
    } else if (d.kind === "zone-resize") {
      updateZone(d.id, { w: clamp(d.orig.w + dx, 0.02, 1 - d.orig.x), h: clamp(d.orig.h + dy, 0.02, 1 - d.orig.y) });
    } else if (d.kind === "place-move") {
      setPlacement({ x: clamp(d.ox + dx, -0.5, 1), y: clamp(d.oy + dy, -0.5, 1), w: placement?.w ?? 0.9 });
    }
  }

  function onUp() {
    drag.current = null;
  }

  /** Piltangenter flyttar vald yta eller mall, för den som inte använder mus. */
  function onKey(e: React.KeyboardEvent, apply: (dx: number, dy: number) => void) {
    const step = e.shiftKey ? 0.05 : 0.01;
    const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = move[e.key];
    if (!m) return;
    e.preventDefault();
    apply(m[0], m[1]);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/annonser/companies/${companyId}/assets/${assetId}/layout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(ADS_ERRORS[data.error] ?? FALLBACK);
      else {
        setLayout(data.layout);
        setSaved(data.layout);
        setNote("Sparat.");
        router.refresh();
      }
    } catch {
      setError(FALLBACK);
    } finally {
      setBusy(false);
    }
  }

  const size = FORMAT_SIZE[format];
  const safe = safeInsets(format);
  const tplHeightFrac = placement ? (placement.w * size.w) / aspect / size.h : 0;

  /** Textyta som CSS i procent av sitt eget underlag (mallen). */
  const zoneStyle = (z: TextZone): React.CSSProperties => ({
    left: `${z.x * 100}%`,
    top: `${z.y * 100}%`,
    width: `${z.w * 100}%`,
    height: `${z.h * 100}%`,
    transform: `rotate(${z.rotation}deg)`,
  });

  const zoneBox = (z: TextZone, i: number, interactive: boolean) => {
    const active = z.id === selected;
    return (
      <div
        key={z.id}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : -1}
        aria-label={`${ROLE_NAMES[z.role]}, yta ${i + 1}. Piltangenter flyttar.`}
        aria-pressed={interactive ? active : undefined}
        onClick={interactive ? () => setSelected(z.id) : undefined}
        onKeyDown={interactive ? (e) => onKey(e, (dx, dy) => updateZone(z.id, { x: clamp(z.x + dx, 0, 1 - z.w), y: clamp(z.y + dy, 0, 1 - z.h) })) : undefined}
        onPointerDown={interactive ? (e) => { setSelected(z.id); begin(e, { kind: "zone-move", id: z.id, startX: e.clientX, startY: e.clientY, orig: z }); } : undefined}
        style={zoneStyle(z)}
        className={`absolute border-2 ${active ? "border-milou-500 bg-milou-500/20" : "border-dashed border-gray-900/60 bg-white/20"} ${interactive ? "cursor-move touch-none" : "pointer-events-none"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-milou-500`}
      >
        <span className="absolute -top-0.5 -left-0.5 bg-gray-900 text-white text-[10px] font-bold px-1 leading-4 pointer-events-none">{i + 1}</span>
        {interactive && active && (
          <span
            onPointerDown={(e) => begin(e, { kind: "zone-resize", id: z.id, startX: e.clientX, startY: e.clientY, orig: z })}
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-milou-500 border-2 border-white cursor-nwse-resize touch-none"
            aria-hidden
          />
        )}
      </div>
    );
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Vy" className="flex border border-gray-300 bg-white">
          {([["zones", "1. Textytor"], ["placement", "2. Placering per format"]] as const).map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-bold ${view === v ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "placement" && (
          <div role="tablist" aria-label="Format" className="flex border border-gray-300 bg-white">
            {FORMATS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={format === f}
                onClick={() => setFormat(f)}
                className={`px-3 py-2 text-sm font-bold ${format === f ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                {f}
                {layout.placements[f] ? " ✓" : ""}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {dirty && <span className="text-sm text-gray-600">Osparade ändringar</span>}
          <button
            onClick={() => void save()}
            disabled={!dirty || busy}
            className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-40 text-white px-4 py-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            Spara layout
          </button>
        </div>
      </div>
      <p role="alert" className="text-sm text-milou-600 mt-2 empty:hidden">{error}</p>
      <p role="status" className="text-sm text-gray-600 mt-2 empty:hidden">{note}</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ----- ytan man arbetar på ----- */}
        <div>
          {view === "zones" ? (
            <div
              ref={stage}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={() => setSelected(null)}
              className="relative bg-checker select-none mx-auto max-w-full"
              style={{ aspectRatio: String(aspect), width: `min(100%, calc(70vh * ${aspect}))` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Mallen ${name}`}
                draggable={false}
                onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              {layout.zones.map((z, i) => zoneBox(z, i, true))}
            </div>
          ) : (
            <div className="mx-auto" style={{ width: `min(100%, calc(72vh * ${size.w / size.h}))` }}>
              <div
                ref={stage}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="relative bg-gray-300 select-none overflow-hidden"
                style={{ aspectRatio: `${size.w} / ${size.h}` }}
              >
                {/* Skyddszon: det som plattformens gränssnitt kan täcka ligger utanför den streckade linjen. */}
                <div
                  aria-hidden
                  className="absolute pointer-events-none border-2 border-dashed border-red-600/70"
                  style={{ left: `${safe.left}%`, right: `${safe.right}%`, top: `${safe.top}%`, bottom: `${safe.bottom}%` }}
                />
                {placement ? (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Mallen i formatet ${format}. Dra eller använd piltangenter för att flytta.`}
                    onPointerDown={(e) => begin(e, { kind: "place-move", startX: e.clientX, startY: e.clientY, ox: placement.x, oy: placement.y })}
                    onKeyDown={(e) => onKey(e, (dx, dy) => setPlacement({ ...placement, x: clamp(placement.x + dx, -0.5, 1), y: clamp(placement.y + dy, -0.5, 1) }))}
                    className="absolute cursor-move touch-none outline outline-2 outline-milou-500/60 focus-visible:outline-offset-2"
                    style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, width: `${placement.w * 100}%`, height: `${tplHeightFrac * 100}%` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
                    {layout.zones.map((z, i) => zoneBox(z, i, false))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-700">
                    Mallen har ingen placering i {format} än.
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {safe.top || safe.bottom
                  ? "Streckad röd linje: skyddszonen. Text utanför den kan täckas av Reels, Stories och TikToks knappar och text."
                  : "I 1:1 och 4:5 ligger bilden i flödet utan gränssnitt över, så här finns ingen skyddszon."}
              </p>
            </div>
          )}
        </div>

        {/* ----- sidopanel ----- */}
        <div className="flex flex-col gap-5">
          <section aria-label="Status" className="bg-white p-4 text-sm">
            <p className="font-bold">{status.ready ? "Mallen kan väljas av AI:n" : "Mallen kan inte väljas av AI:n än"}</p>
            <p className="text-gray-600 mt-1">
              {status.zones} {status.zones === 1 ? "textyta" : "textytor"} · placerad i {status.formats.length ? status.formats.join(", ") : "inget format"}
            </p>
            {!status.ready && <p className="text-gray-600 mt-1">Den behöver minst en textyta och en placering i minst ett format.</p>}
          </section>

          {view === "zones" ? (
            <>
              <section aria-label="Textytor" className="bg-white p-4">
                <h3 className="font-bold text-sm mb-2">Textytor ({layout.zones.length} av {MAX_ZONES})</h3>
                <ul className="flex flex-col gap-1">
                  {layout.zones.map((z, i) => (
                    <li key={z.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setSelected(z.id)}
                        aria-pressed={z.id === selected}
                        className={`flex-1 text-left text-sm px-2.5 py-1.5 ${z.id === selected ? "bg-gray-900 text-white font-bold" : "bg-gray-100 hover:bg-gray-200"}`}
                      >
                        {i + 1}. {ROLE_NAMES[z.role]}
                        {z.hint ? ` – ${z.hint}` : ""}
                      </button>
                      <button
                        onClick={() => removeZone(z.id)}
                        aria-label={`Ta bort yta ${i + 1}`}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-milou-600"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 mt-3">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => addZone(r)}
                      disabled={layout.zones.length >= MAX_ZONES}
                      className="flex items-center gap-1 text-sm font-bold border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 px-2.5 py-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden /> {ROLE_NAMES[r]}
                    </button>
                  ))}
                </div>
              </section>

              {zone && <ZoneForm zone={zone} onChange={(patch) => updateZone(zone.id, patch)} />}
            </>
          ) : (
            <section aria-label={`Placering i ${format}`} className="bg-white p-4 flex flex-col gap-3">
              <h3 className="font-bold text-sm">Placering i {format}</h3>
              {placement ? (
                <>
                  <label className="text-sm font-bold" htmlFor="place-w">
                    Mallens bredd: {Math.round(placement.w * 100)} % av bilden
                  </label>
                  <input
                    id="place-w"
                    type="range"
                    min={10}
                    max={150}
                    value={Math.round(placement.w * 100)}
                    onChange={(e) => setPlacement({ ...placement, w: Number(e.target.value) / 100 })}
                  />
                  <button onClick={() => setPlacement(defaultPlacement(format, aspect))} className="text-sm font-bold border border-gray-300 bg-white hover:bg-gray-100 px-3 py-1.5">
                    Återställ förslaget
                  </button>
                  <button onClick={() => setPlacement(null)} className="text-sm font-bold text-milou-600 hover:underline text-left">
                    Ta bort placeringen i {format}
                  </button>
                </>
              ) : (
                <button onClick={() => setPlacement(defaultPlacement(format, aspect))} className="text-sm font-bold bg-gray-900 hover:bg-gray-700 text-white px-3 py-2">
                  Placera mallen i {format}
                </button>
              )}
              {layout.zones.length === 0 && <p className="text-sm text-gray-600">Lägg till textytor under fliken Textytor, så syns de här.</p>}
              {warnings.length > 0 && (
                <ul className="flex flex-col gap-1.5" aria-label="Varningar">
                  {warnings.map((w) => (
                    <li key={w} className="flex gap-1.5 text-sm text-gray-900 bg-amber-50 border border-amber-300 px-2.5 py-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden /> {w}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ZoneForm({ zone, onChange }: { zone: TextZone; onChange: (patch: Partial<TextZone>) => void }) {
  const id = `z-${zone.id}`;
  return (
    <section aria-label="Vald textyta" className="bg-white p-4 flex flex-col gap-2">
      <h3 className="font-bold text-sm">Vald textyta</h3>

      <label htmlFor={`${id}-role`} className="text-sm font-bold">Roll</label>
      <select id={`${id}-role`} value={zone.role} onChange={(e) => onChange({ role: e.target.value as ZoneRole })} className={field}>
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}
      </select>

      <label htmlFor={`${id}-hint`} className="text-sm font-bold">Vad ska stå här? <span className="font-normal text-gray-600">(till AI:n)</span></label>
      <input id={`${id}-hint`} value={zone.hint} maxLength={80} onChange={(e) => onChange({ hint: e.target.value })} placeholder="Till exempel: erbjudandet i korta ord" className={field} />

      <label htmlFor={`${id}-max`} className="text-sm font-bold">Teckengräns</label>
      <input
        id={`${id}-max`}
        type="number"
        min={1}
        max={MAX_CHARS_LIMIT}
        value={zone.maxChars}
        onChange={(e) => onChange({ maxChars: clamp(Math.round(Number(e.target.value) || 1), 1, MAX_CHARS_LIMIT) })}
        className={field}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${id}-color`} className="text-sm font-bold block mb-1">Textfärg</label>
          <input id={`${id}-color`} type="color" value={zone.color} onChange={(e) => onChange({ color: e.target.value.toUpperCase() })} className="w-full h-9 border border-gray-300 bg-white" />
        </div>
        <div>
          <label htmlFor={`${id}-weight`} className="text-sm font-bold block mb-1">Tjocklek</label>
          <select id={`${id}-weight`} value={zone.weight} onChange={(e) => onChange({ weight: Number(e.target.value) as TextZone["weight"] })} className={field}>
            {WEIGHTS.map((w) => <option key={w} value={w}>{w === 400 ? "Normal" : w === 700 ? "Fet" : "Extra fet"}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-align`} className="text-sm font-bold block mb-1">Sidled</label>
          <select id={`${id}-align`} value={zone.align} onChange={(e) => onChange({ align: e.target.value as TextZone["align"] })} className={field}>
            {ALIGNS.map((a) => <option key={a} value={a}>{ALIGN_NAMES[a]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-valign`} className="text-sm font-bold block mb-1">Höjdled</label>
          <select id={`${id}-valign`} value={zone.valign} onChange={(e) => onChange({ valign: e.target.value as TextZone["valign"] })} className={field}>
            {VALIGNS.map((a) => <option key={a} value={a}>{VALIGN_NAMES[a]}</option>)}
          </select>
        </div>
      </div>

      <label htmlFor={`${id}-rot`} className="text-sm font-bold">Lutning: {zone.rotation}°</label>
      <input id={`${id}-rot`} type="range" min={-45} max={45} step={1} value={zone.rotation} onChange={(e) => onChange({ rotation: Number(e.target.value) })} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={zone.uppercase} onChange={(e) => onChange({ uppercase: e.target.checked })} /> Versaler
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={zone.solidBg} onChange={(e) => onChange({ solidBg: e.target.checked })} /> Ytan ligger mot en enfärgad botten
      </label>
    </section>
  );
}
