"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { logoKey, MAX_SECTIONS, newId, SECTION_TYPES, type ReportDoc, type Section, type SectionType } from "@/lib/report/doc";
import { blankKeepingLogos, fileBase, parseProjectFile, withLogos } from "@/lib/report/project";
import { sampleDoc } from "@/lib/report/sample";
import { slideLabel } from "@/lib/report/render";
import { sortKpis, type KpiKey } from "@/lib/report/kpis";
import Inspector, { type Ops } from "./Inspector";
import { PageStyles, Stage, Thumb } from "./PageView";
import { useAutosave } from "./useAutosave";

type Stats = Extract<Section, { type: "stats" }>;
const clone = <T,>(v: T): T => structuredClone(v);

function makeSection(type: SectionType, doc: ReportDoc): Section {
  const id = newId();
  const kpiSection = doc.sections.find((s) => s.type === "kpi");
  const defaults: KpiKey[] = kpiSection && kpiSection.kpis.length ? sortKpis(kpiSection.kpis) : ["spend", "impressions", "clicks", "ctr", "cpc", "cpm"];
  switch (type) {
    case "cover": return { id, type, subtitle: "Utvärdering av annonsering i sociala medier" };
    case "kpi": return { id, type, heading: "Det här mäter vi", intro: "", kpis: ["spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm"], descs: {} };
    case "stats": return { id, type, title: "Ny kampanj", subtitle: "", kpis: defaults, showAds: true, platforms: [{ id: newId(), name: "Meta", values: {}, ads: [] }] };
    case "comment": return { id, type, label: "Kommentar", heading: "Rubrik", body: "" };
    case "summary": return { id, type, heading: "Sammanfattning", kpis: defaults, showTiles: true, showBudget: true, showInsights: true, conclusion: "" };
  }
}

function cloneSection(s: Section): Section {
  const c = clone(s);
  c.id = newId();
  if (c.type === "stats") {
    c.platforms.forEach((p) => { p.id = newId(); p.ads.forEach((a) => { a.id = newId(); }); });
    if (c.title) c.title += " (kopia)";
  }
  return c;
}

export default function ReportEditor({ id, initial }: { id: string; initial: ReportDoc }) {
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [selId, setSelId] = useState<string | null>(initial.sections[0]?.id ?? null);
  const [menu, setMenu] = useState(false);
  const [projectMenu, setProjectMenu] = useState(false);
  const [drag, setDrag] = useState<{ id: string; over: { id: string; before: boolean } | null } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const [toast, setToast] = useState<{ text: string; undo: boolean } | null>(null);
  const undoSnap = useRef<{ doc: ReportDoc; selId: string | null } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { state, retry } = useAutosave(id, doc, initial);
  // Miniatyrerna får hänga efter en aning medan man skriver.
  const railDoc = useDeferredValue(doc);

  const index = Math.max(0, doc.sections.findIndex((s) => s.id === selId));
  const sec = doc.sections[index] ?? null;

  const edit = useCallback((fn: (d: ReportDoc) => void) => setDoc((prev) => { const d = clone(prev); fn(d); return d; }), []);
  const say = useCallback((text: string, undo = false) => {
    setToast({ text, undo });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), undo ? 7000 : 3800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setProjectMenu(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ops: Ops = {
    newId,
    say,
    setLogo: (name, url) => edit((d) => {
      const key = logoKey(name);
      if (!key) return;
      if (url) d.logos[key] = url;
      else delete d.logos[key];
    }),
    patchMeta: (p) => edit((d) => { Object.assign(d.meta, p); }),
    patchSection: (sid, p) => edit((d) => { const s = d.sections.find((x) => x.id === sid); if (s) Object.assign(s, p); }),
    toggleKpi: (sid, k) => edit((d) => {
      const s = d.sections.find((x) => x.id === sid);
      if (s && "kpis" in s) s.kpis = s.kpis.includes(k) ? s.kpis.filter((x) => x !== k) : sortKpis([...s.kpis, k]);
    }),
    editStats: (sid, fn) => edit((d) => { const s = d.sections.find((x): x is Stats => x.id === sid && x.type === "stats"); if (s) fn(s); }),
    undoable: (message, fn) => {
      undoSnap.current = { doc, selId };
      fn();
      say(message, true);
    },
    move: (dir) => edit((d) => {
      const from = d.sections.findIndex((s) => s.id === selId);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= d.sections.length) return;
      const [s] = d.sections.splice(from, 1);
      d.sections.splice(to, 0, s);
    }),
    duplicate: () => {
      if (!sec || doc.sections.length >= MAX_SECTIONS) return;
      const c = cloneSection(sec);
      edit((d) => { d.sections.splice(index + 1, 0, c); });
      setSelId(c.id);
      say("Sektionen duplicerades.");
    },
    remove: () => {
      if (!sec) return;
      undoSnap.current = { doc, selId };
      const next = doc.sections[index + 1] ?? doc.sections[index - 1] ?? null;
      edit((d) => { d.sections.splice(index, 1); });
      setSelId(next?.id ?? null);
      say(`${SECTION_TYPES[sec.type].name} togs bort.`, true);
    },
  };

  const addSection = (type: SectionType) => {
    setMenu(false);
    if (doc.sections.length >= MAX_SECTIONS) return say(`Det får finnas högst ${MAX_SECTIONS} sidor i en rapport.`);
    const s = makeSection(type, doc);
    edit((d) => { d.sections.splice(sec ? index + 1 : d.sections.length, 0, s); });
    setSelId(s.id);
  };

  const focusSlide = (sid: string) => requestAnimationFrame(() => {
    const el = railRef.current?.querySelector<HTMLElement>(`[data-id="${sid}"]`);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  const moveSection = (sid: string, to: number) => {
    edit((d) => {
      const from = d.sections.findIndex((s) => s.id === sid);
      if (from < 0) return;
      const [s] = d.sections.splice(from, 1);
      d.sections.splice(Math.max(0, Math.min(to, d.sections.length)), 0, s);
    });
  };

  /** Piltangenter byter sida, Alt+pil flyttar sidan. */
  const onSlideKey = (e: React.KeyboardEvent, sid: string, i: number) => {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    if (e.altKey) {
      if (i + d < 0 || i + d >= doc.sections.length) return;
      setSelId(sid);
      moveSection(sid, i + d);
      focusSlide(sid);
    } else {
      const next = doc.sections[i + d];
      if (next) {
        setSelId(next.id);
        focusSlide(next.id);
      }
    }
  };

  const horizontalRail = () => window.matchMedia("(max-width: 999px)").matches;
  const onDragOver = (e: React.DragEvent, sid: string) => {
    if (!drag) return;
    e.preventDefault();
    if (sid === drag.id) return setDrag({ ...drag, over: null });
    const r = e.currentTarget.getBoundingClientRect();
    const before = horizontalRail() ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
    if (drag.over?.id !== sid || drag.over.before !== before) setDrag({ ...drag, over: { id: sid, before } });
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (drag?.over) {
      const from = doc.sections.findIndex((s) => s.id === drag.id);
      let to = doc.sections.findIndex((s) => s.id === drag.over!.id) + (drag.over.before ? 0 : 1);
      if (from < to) to -= 1;
      setSelId(drag.id);
      moveSection(drag.id, to);
    }
    setDrag(null);
  };

  /** Byter hela rapporten (exempel, ny tom, inläst fil). Går att ångra. */
  const replaceDoc = (next: ReportDoc, message: string) => {
    undoSnap.current = { doc, selId };
    setDoc(next);
    setSelId(next.sections[0]?.id ?? null);
    say(message, true);
  };

  const saveProjectFile = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase(doc)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    say("Projektfilen laddas ner.");
  };

  const openProjectFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const incoming = parseProjectFile(String(reader.result));
      if (!incoming) return say("Filen kunde inte läsas. Välj en projektfil som sparats från verktyget.");
      replaceDoc(withLogos(incoming, doc), `${f.name} är inläst.`);
    };
    reader.onerror = () => say("Filen kunde inte läsas.");
    reader.readAsText(f);
  };

  const deleteReport = async () => {
    if (!confirm("Ta bort hela rapporten? Det går inte att ångra.")) return;
    const res = await fetch(`/api/mediaplan/rapport/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/mediaplan/rapport");
    else say("Kunde inte ta bort rapporten. Försök igen.");
  };

  const undo = () => {
    const snap = undoSnap.current;
    if (!snap) return;
    setDoc(snap.doc);
    setSelId(snap.selId);
    undoSnap.current = null;
    setToast(null);
  };

  const statusText = { saved: "Sparat", saving: "Sparar …", dirty: "Osparade ändringar", error: "Kunde inte spara" }[state];

  return (
    <div className="flex flex-col min-[1000px]:h-[calc(100dvh-5.75rem)] bg-gray-100">
      <PageStyles />
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-wrap">
        <Link href="/mediaplan/rapport" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-500 shrink-0">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Alla rapporter
        </Link>
        <span className="text-gray-600 min-w-0 truncate pl-3 border-l border-gray-200">{[doc.meta.client, doc.meta.campaign].filter(Boolean).join(" · ")}</span>
        <span className="flex-1" />
        <span role="status" className={`inline-flex items-center gap-1.5 text-xs ${state === "error" ? "text-milou-600 font-bold" : "text-gray-600"}`}>
          {state === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
          {state === "saved" && <Check className="w-3.5 h-3.5" aria-hidden />}
          {state === "error" && <TriangleAlert className="w-3.5 h-3.5" aria-hidden />}
          {statusText}
          {state === "error" && (
            <button type="button" onClick={retry} className="underline ml-1">Försök igen</button>
          )}
        </span>
        <button type="button" onClick={deleteReport} className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-milou-600">
          <Trash2 className="w-3.5 h-3.5" aria-hidden /> Ta bort rapporten
        </button>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={projectMenu}
            onClick={() => { setProjectMenu((v) => !v); setMenu(false); }}
            className="inline-flex items-center gap-2 h-9 px-3.5 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
          >
            Projekt <ChevronDown className="w-4 h-4" aria-hidden />
          </button>
          {projectMenu && (
            <>
              <button type="button" aria-label="Stäng menyn" className="fixed inset-0 z-40 cursor-default" onClick={() => setProjectMenu(false)} />
              <div role="menu" aria-label="Projekt" className="absolute right-0 top-full mt-1.5 z-50 min-w-[290px] bg-white border border-gray-200 shadow-xl p-1.5">
                {[
                  { title: "Spara projektfil", desc: "Ladda ner rapporten som .json och fortsätt senare", run: saveProjectFile },
                  { title: "Öppna projektfil", desc: "Läs in en sparad .json-rapport", run: () => fileInput.current?.click() },
                  { title: "Visa exempelrapporten", desc: "Ersätter nuvarande innehåll, går att ångra", run: () => replaceDoc({ ...sampleDoc(), logos: doc.logos }, "Exempelrapporten är inläst.") },
                  { title: "Ny tom rapport", desc: "Börja om med bara en startsida", run: () => replaceDoc(blankKeepingLogos(doc), "Ny tom rapport skapad. Logotyperna finns kvar.") },
                ].map((it) => (
                  <button key={it.title} type="button" role="menuitem" onClick={() => { setProjectMenu(false); it.run(); }} className="block w-full text-left px-2.5 py-2 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none">
                    <b className="block font-semibold">{it.title}</b>
                    <small className="block text-gray-600 text-xs">{it.desc}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            hidden
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) openProjectFile(f);
            }}
          />
        </div>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => { setMenu((v) => !v); setProjectMenu(false); }}
            className="inline-flex items-center gap-2 h-9 px-3.5 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" aria-hidden /> Lägg till sektion
          </button>
          {menu && (
            <>
              <button type="button" aria-label="Stäng menyn" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} />
              <div role="menu" aria-label="Välj mall" className="absolute right-0 top-full mt-1.5 z-50 min-w-[290px] bg-white border border-gray-200 shadow-xl p-1.5">
                {(Object.entries(SECTION_TYPES) as [SectionType, { name: string; desc: string }][]).map(([t, d]) => (
                  <button key={t} type="button" role="menuitem" onClick={() => addSection(t)} className="block w-full text-left px-2.5 py-2 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none">
                    <b className="block font-semibold">{d.name}</b>
                    <small className="block text-gray-600 text-xs">{d.desc}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 min-[1000px]:grid-cols-[212px_minmax(0,1fr)_400px]">
        <nav ref={railRef} aria-label="Sektioner i rapporten" className="bg-white border-b min-[1000px]:border-b-0 min-[1000px]:border-r border-gray-200 flex min-[1000px]:flex-col gap-3.5 overflow-x-auto min-[1000px]:overflow-y-auto min-[1000px]:overflow-x-hidden p-3 min-[1000px]:pb-6">
          {railDoc.sections.map((s, i) => {
            const selected = s.id === selId;
            return (
              <button
                key={s.id}
                type="button"
                data-id={s.id}
                draggable
                onDragStart={(e) => { setDrag({ id: s.id, over: null }); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", s.id); } catch {} }}
                onDragOver={(e) => onDragOver(e, s.id)}
                onDrop={onDrop}
                onDragEnd={() => setDrag(null)}
                onKeyDown={(e) => onSlideKey(e, s.id, i)}
                onClick={() => setSelId(s.id)}
                aria-current={selected ? "true" : undefined}
                aria-label={`Sida ${i + 1}: ${slideLabel(s)}`}
                className={`relative grid grid-cols-[18px_164px] gap-1.5 text-left shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500 ${drag?.id === s.id ? "opacity-40" : ""}`}
              >
                {drag?.over?.id === s.id && (
                  <span
                    aria-hidden
                    className={`absolute bg-milou-500 pointer-events-none min-[1000px]:left-6 min-[1000px]:right-0 min-[1000px]:h-[3px] max-[999px]:top-0 max-[999px]:bottom-0 max-[999px]:w-[3px] ${
                      drag.over.before ? "min-[1000px]:-top-2 max-[999px]:-left-2" : "min-[1000px]:-bottom-2 max-[999px]:-right-2"
                    }`}
                  />
                )}
                <span className={`text-xs text-right pt-0.5 tabular-nums ${selected ? "text-milou-600 font-bold" : "text-gray-600"}`}>{i + 1}</span>
                <span>
                  <span className={`block ${selected ? "ring-2 ring-milou-500" : "ring-1 ring-gray-300 hover:ring-gray-400"}`}>
                    <Thumb doc={railDoc} index={i} />
                  </span>
                  <span className={`block text-xs mt-1 truncate max-w-[164px] ${selected ? "text-gray-900" : "text-gray-600"}`}>{slideLabel(s)}</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMenu(true)}
            className="ml-6 min-[1000px]:ml-6 shrink-0 w-[164px] h-[60px] max-[999px]:h-[116px] max-[999px]:w-[120px] max-[999px]:ml-0 border-[1.5px] border-dashed border-gray-400 text-gray-600 flex items-center justify-center gap-1.5 hover:border-milou-500 hover:text-milou-600"
          >
            <Plus className="w-4 h-4" aria-hidden /> Ny sektion
          </button>
        </nav>

        <section aria-label="Förhandsvisning av vald sida" className="min-w-0 min-h-0 flex flex-col items-center justify-center gap-3 p-6 max-[999px]:p-4 overflow-hidden">
          {sec ? (
            <>
              <Stage doc={doc} index={index} />
              <p className="text-xs text-gray-600 min-h-[18px]">Sida {index + 1} av {doc.sections.length} · {SECTION_TYPES[sec.type].name} · A4 liggande</p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3.5 text-gray-600 text-center p-10">
              <p>Rapporten är tom. Lägg till en första sektion.</p>
              <button type="button" onClick={() => setMenu(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-milou-500 hover:bg-milou-600 text-white text-sm font-bold">
                <Plus className="w-4 h-4" aria-hidden /> Lägg till sektion
              </button>
            </div>
          )}
        </section>

        <aside aria-label="Inställningar för vald sektion" className="bg-white border-t min-[1000px]:border-t-0 min-[1000px]:border-l border-gray-200 min-[1000px]:overflow-y-auto min-h-0">
          <Inspector doc={doc} sec={sec} index={index} ops={ops} />
        </aside>
      </div>

      {toast && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-5 z-[70] flex items-center gap-3.5 bg-gray-900 text-white pl-4 pr-3 py-2.5 shadow-xl text-sm max-w-[calc(100%-2rem)]">
          <span>{toast.text}</span>
          {toast.undo && <button type="button" onClick={undo} className="font-bold text-peach px-1.5 py-1">Ångra</button>}
        </div>
      )}
    </div>
  );
}
