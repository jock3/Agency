"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, ImagePlus, Plus, Trash2 } from "lucide-react";
import { logoKey, SECTION_TYPES, type ReportDoc, type Section } from "@/lib/report/doc";
import { processLogo, type LogoError } from "@/lib/report/logo";
import { fmtPlain, isNum, KPI_ORDER, KPIS, kpiValue, neededRaw, parseNum, sortKpis, toInput, type KpiKey, type PlatformRow, type RawKey } from "@/lib/report/kpis";

export const PLATFORM_PRESETS = ["Meta", "TikTok", "LinkedIn", "Snapchat", "Google Ads", "YouTube", "Pinterest"];

type Stats = Extract<Section, { type: "stats" }>;

/** Allt panelen kan göra med rapporten. Implementeras av editorn. */
export interface Ops {
  patchMeta: (p: Partial<ReportDoc["meta"]>) => void;
  patchSection: (id: string, p: Record<string, unknown>) => void;
  toggleKpi: (id: string, k: KpiKey) => void;
  editStats: (id: string, fn: (s: Stats) => void) => void;
  move: (dir: -1 | 1) => void;
  duplicate: () => void;
  remove: () => void;
  /** Tar ögonblicksbild och visar "Ångra" efter ändringen. */
  undoable: (message: string, fn: () => void) => void;
  newId: () => string;
  /** Sätter eller (null) tar bort logotypen för ett plattformsnamn. Gäller alla rader med samma namn. */
  setLogo: (name: string, url: string | null) => void;
  say: (text: string) => void;
}

const input = "w-full border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm focus:outline-none focus:border-milou-500 aria-[invalid=true]:border-red-600";
const label = "text-xs font-semibold text-gray-600";

function Field({ title, value, onChange, textarea, rows, hint, datalist }: { title: string; value: string; onChange: (v: string) => void; textarea?: boolean; rows?: number; hint?: string; datalist?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>{title}</label>
      {textarea ? (
        <textarea id={id} value={value} rows={rows ?? 4} onChange={(e) => onChange(e.target.value)} className={`${input} resize-y leading-normal`} />
      ) : (
        <input id={id} type="text" value={value} list={datalist} autoComplete="off" onChange={(e) => onChange(e.target.value)} className={input} />
      )}
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

function Check({ title, checked, onChange }: { title: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 text-sm cursor-pointer">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-milou-500" />
      <span>{title}</span>
    </label>
  );
}

function KpiChips({ section, title, hint, warn, ops }: { section: { id: string; kpis: KpiKey[] }; title: string; hint?: string; warn?: boolean; ops: Ops }) {
  const gid = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={gid} className={label}>{title}</span>
      <div role="group" aria-labelledby={gid} className="flex flex-wrap gap-1.5">
        {KPI_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            title={KPIS[k].name}
            aria-pressed={section.kpis.includes(k)}
            onClick={() => ops.toggleKpi(section.id, k)}
            className="h-7 px-3 rounded-full border border-gray-300 bg-white text-[12.5px] hover:border-gray-500 aria-pressed:bg-gray-900 aria-pressed:border-gray-900 aria-pressed:text-white"
          >
            {KPIS[k].abbr || KPIS[k].name}
          </button>
        ))}
      </div>
      {hint && <p className={`text-xs ${warn ? "text-milou-600" : "text-gray-600"}`}>{hint}</p>}
    </div>
  );
}

/**
 * Ett siffrefält. Texten i fältet sparas lokalt medan man skriver ("2," får stå kvar),
 * och rapporten får värdet först när det går att tolka. Ogiltigt värde ger röd ram och räknas som tomt.
 */
function MetricInput({ title, value, placeholder, onChange }: { title: string; value: number | null | undefined; placeholder?: string; onChange: (v: number | null) => void }) {
  const id = useId();
  const [text, setText] = useState(isNum(value) ? toInput(value) : "");
  const [invalid, setInvalid] = useState(false);

  // Läs in utifrån när värdet ändrats av något annat (ångra, byte av sida), men inte under skrivning.
  useEffect(() => {
    const own = parseNum(text);
    const same = isNum(value) ? own === value : own === null || Number.isNaN(own);
    if (!same) {
      setText(isNum(value) ? toInput(value) : "");
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="text-[11.5px] text-gray-600 truncate">{title}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid}
        value={text}
        placeholder={placeholder}
        onBlur={() => {
          // Tusentalsavgränsare när man lämnar fältet, inte medan man skriver.
          const n = parseNum(text);
          if (n !== null && !Number.isNaN(n) && n >= 0) setText(toInput(n));
        }}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const n = parseNum(t);
          if (Number.isNaN(n)) {
            setInvalid(true);
            onChange(null);
          } else {
            setInvalid(false);
            onChange(n !== null && n >= 0 ? n : null);
          }
        }}
        className={`${input} text-right tabular-nums py-1.5 px-2`}
      />
    </div>
  );
}

function MetricGrid({ need, values, sums, onChange }: { need: RawKey[]; values: Partial<Record<RawKey, number | null>>; sums: Partial<Record<RawKey, number | null>> | null; onChange: (m: RawKey, v: number | null) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
      {need.map((m) => (
        <MetricInput
          key={m}
          title={`${KPIS[m].name}${m === "spend" ? " (kr)" : ""}`}
          value={values[m]}
          placeholder={sums ? `Σ ${isNum(sums[m]) ? fmtPlain(sums[m] as number) : "–"}` : undefined}
          onChange={(v) => onChange(m, v)}
        />
      ))}
    </div>
  );
}

const LOGO_ERRORS: Record<LogoError, string> = {
  type: "Bilden kunde inte läsas. Använd PNG, JPG, WebP eller SVG.",
  read: "Bilden kunde inte läsas. Använd PNG, JPG, WebP eller SVG.",
  decode: "Bilden kunde inte läsas. Använd PNG, JPG, WebP eller SVG.",
  big: "Bilden blev för stor. Prova en enklare version av logotypen.",
};

function LogoSlot({ name, src, ops }: { name: string; src: string | undefined; ops: Ops }) {
  const file = useRef<HTMLInputElement>(null);
  const label = `${src ? "Byt" : "Ladda upp"} logotyp för ${name || "plattformen"}`;
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={src ? "Byt logotyp" : "Ladda upp logotyp"}
        onClick={() => (logoKey(name) ? file.current?.click() : ops.say("Ge plattformen ett namn först."))}
        className={`w-[38px] h-[38px] shrink-0 grid place-items-center overflow-hidden text-gray-600 hover:border-milou-500 hover:text-milou-600 ${src ? "border border-gray-300 bg-white" : "border border-dashed border-gray-400 bg-gray-50"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" width={26} height={26} /> : <ImagePlus className="w-4 h-4" aria-hidden />}
      </button>
      <input
        ref={file}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            ops.setLogo(name, await processLogo(f));
            ops.say("Logotypen är uppladdad.");
          } catch (err) {
            ops.say(LOGO_ERRORS[(err as Error).message as LogoError] ?? LOGO_ERRORS.read);
          }
        }}
      />
    </>
  );
}

function PlatformCard({ sec, p, need, logos, ops }: { sec: Stats; p: PlatformRow; need: RawKey[]; logos: ReportDoc["logos"]; ops: Ops }) {
  const logo = p.name ? logos[logoKey(p.name)] : undefined;
  const sums = p.ads.length ? Object.fromEntries(need.map((m) => [m, kpiValue(m, p.ads.map((a) => a.values))])) : null;
  const setPlatform = (fn: (x: PlatformRow) => void) => ops.editStats(sec.id, (s) => { const t = s.platforms.find((x) => x.id === p.id); if (t) fn(t); });
  return (
    <div className="border border-gray-300 p-3 flex flex-col gap-2.5 bg-white">
      <div className="flex gap-1.5 items-center">
        <LogoSlot name={p.name} src={logo} ops={ops} />
        <input
          type="text"
          list="rp-platform-list"
          value={p.name}
          onChange={(e) => setPlatform((t) => { t.name = e.target.value; })}
          placeholder="Plattformens namn"
          aria-label="Plattformens namn"
          autoComplete="off"
          className={`${input} font-bold flex-1 min-w-0`}
        />
        <button
          type="button"
          aria-label={`Ta bort ${p.name || "plattformen"}`}
          title="Ta bort plattform"
          onClick={() => ops.undoable(`${p.name || "Plattformen"} togs bort.`, () => ops.editStats(sec.id, (s) => { s.platforms = s.platforms.filter((x) => x.id !== p.id); }))}
          className="w-8 h-8 grid place-items-center text-gray-600 hover:text-milou-600"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
        </button>
      </div>
      <div className="flex justify-between items-center gap-2 text-xs text-gray-600 -mt-0.5">
        {logo ? (
          <>
            <span>Logotypen används på alla {p.name.trim()}-rader.</span>
            <button type="button" className="text-milou-600 font-semibold shrink-0" onClick={() => ops.undoable(`Logotypen för ${p.name.trim()} togs bort.`, () => ops.setLogo(p.name, null))}>
              Ta bort logotyp
            </button>
          </>
        ) : (
          <span>Klicka på rutan för att ladda upp plattformens ikon, helst kvadratisk PNG eller SVG.</span>
        )}
      </div>
      {need.length > 0 && <MetricGrid need={need} values={p.values} sums={sums} onChange={(m, v) => setPlatform((t) => { if (v === null) delete t.values[m]; else t.values[m] = v; })} />}
      {p.ads.length > 0 && need.length > 0 && (
        <p className="text-xs text-gray-600">Tomma fält summeras från annonserna. Fyll i ett värde för att ersätta summan, till exempel räckvidd utan överlapp.</p>
      )}
      <div className="flex flex-col gap-2">
        {p.ads.map((a) => (
          <div key={a.id} className="border-l-[3px] border-peach pl-2.5 pr-2 py-2 flex flex-col gap-2 bg-gray-50">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-600">Annons</span>
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                value={a.name}
                onChange={(e) => setPlatform((t) => { const x = t.ads.find((y) => y.id === a.id); if (x) x.name = e.target.value; })}
                placeholder="Annonsens namn"
                aria-label="Annonsens namn"
                autoComplete="off"
                className={`${input} flex-1 min-w-0 bg-white`}
              />
              <button
                type="button"
                aria-label={`Ta bort annonsen ${a.name}`}
                title="Ta bort annons"
                onClick={() => ops.undoable("Annonsen togs bort.", () => setPlatform((t) => { t.ads = t.ads.filter((y) => y.id !== a.id); }))}
                className="w-8 h-8 grid place-items-center text-gray-600 hover:text-milou-600"
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </div>
            {need.length > 0 && (
              <MetricGrid need={need} values={a.values} sums={null} onChange={(m, v) => setPlatform((t) => { const x = t.ads.find((y) => y.id === a.id); if (x) { if (v === null) delete x.values[m]; else x.values[m] = v; } })} />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => { const id = ops.newId(); setPlatform((t) => { t.ads.push({ id, name: `Annons ${t.ads.length + 1}`, values: {} }); }); }}
        className="self-start inline-flex items-center gap-1.5 h-[30px] px-2.5 border border-dashed border-gray-400 text-gray-600 text-[12.5px] hover:border-milou-500 hover:text-milou-600"
      >
        <Plus className="w-4 h-4" aria-hidden /> Lägg till annons under {p.name || "plattformen"}
      </button>
    </div>
  );
}

function Body({ doc, sec, ops }: { doc: ReportDoc; sec: Section; ops: Ops }) {
  const m = doc.meta;
  const set = (p: Record<string, unknown>) => ops.patchSection(sec.id, p);
  switch (sec.type) {
    case "cover":
      return (
        <>
          <Field title="Kundnamn" value={m.client} onChange={(v) => ops.patchMeta({ client: v })} />
          <Field title="Kampanj- eller rapportnamn" value={m.campaign} onChange={(v) => ops.patchMeta({ campaign: v })} />
          <Field title="Period" value={m.period} onChange={(v) => ops.patchMeta({ period: v })} />
          <Field title="Underrubrik" value={sec.subtitle} onChange={(v) => set({ subtitle: v })} />
          <Field title="Datum" value={m.date} onChange={(v) => ops.patchMeta({ date: v })} />
          <Field title="Avsändare" value={m.agency} onChange={(v) => ops.patchMeta({ agency: v })} />
          <p className="bg-gray-50 px-3 py-2.5 text-[12.5px] text-gray-600">Kundnamn och kampanj visas också i sidfoten på alla sidor.</p>
        </>
      );
    case "kpi": {
      const ks = sortKpis(sec.kpis);
      return (
        <>
          <Field title="Rubrik" value={sec.heading} onChange={(v) => set({ heading: v })} />
          <Field title="Ingress" value={sec.intro} textarea rows={3} onChange={(v) => set({ intro: v })} />
          <KpiChips section={sec} title="Valda KPI:er" hint="Valet blir förvalda kolumner när du lägger till en ny statistiksida." ops={ops} />
          {ks.length > 0 && (
            <p className="text-[13px] font-bold flex justify-between items-baseline mt-1.5">
              Förklaringar <small className="font-normal text-gray-600 text-xs">visas under varje KPI</small>
            </p>
          )}
          {ks.map((k) => (
            <Field
              key={k}
              title={KPIS[k].abbr ? `${KPIS[k].abbr} – ${KPIS[k].name}` : KPIS[k].name}
              value={typeof sec.descs[k] === "string" ? (sec.descs[k] as string) : KPIS[k].desc}
              textarea
              rows={2}
              onChange={(v) => set({ descs: { ...sec.descs, [k]: v } })}
            />
          ))}
        </>
      );
    }
    case "stats": {
      const ks = sortKpis(sec.kpis);
      const need = neededRaw(ks);
      const hint = ks.length > 8 ? `${ks.length} kolumner. Fler än åtta gör tabellen trång i PDF:en.` : ks.length ? `${ks.length} kolumner. Du fyller bara i grunddata, kvoter som CTR och CPC räknas ut automatiskt.` : "Välj minst en KPI.";
      return (
        <>
          <Field title="Kampanjnamn" value={sec.title} hint="Används som radnamn i sammanfattningen." onChange={(v) => set({ title: v })} />
          <Field title="Underrubrik" value={sec.subtitle} hint="Till exempel mål och period." onChange={(v) => set({ subtitle: v })} />
          <KpiChips section={sec} title="Kolumner (KPI:er)" hint={hint} warn={ks.length > 8} ops={ops} />
          <Check title="Visa annonsrader i PDF:en" checked={sec.showAds !== false} onChange={(v) => set({ showAds: v })} />
          <p className="text-[13px] font-bold flex justify-between items-baseline mt-1.5">
            Plattformar <small className="font-normal text-gray-600 text-xs">{sec.platforms.length} st</small>
          </p>
          {sec.platforms.map((p) => <PlatformCard key={p.id} sec={sec} p={p} need={need} logos={doc.logos} ops={ops} />)}
          <div className="flex flex-col gap-1.5">
            <span className={label}>Lägg till plattform</span>
            <div className="flex flex-wrap gap-1.5">
              {[...PLATFORM_PRESETS, ""].map((n) => (
                <button
                  key={n || "annan"}
                  type="button"
                  onClick={() => { const id = ops.newId(); ops.editStats(sec.id, (s) => { s.platforms.push({ id, name: n, values: {}, ads: [] }); }); }}
                  className="h-7 px-3 rounded-full border border-gray-300 bg-white text-[12.5px] hover:border-gray-500"
                >
                  + {n || "Annan"}
                </button>
              ))}
            </div>
          </div>
          <datalist id="rp-platform-list">{PLATFORM_PRESETS.map((n) => <option key={n} value={n} />)}</datalist>
        </>
      );
    }
    case "comment":
      return (
        <>
          <Field title="Etikett" value={sec.label} hint="Den lilla röda texten ovanför rubriken." onChange={(v) => set({ label: v })} />
          <Field title="Rubrik" value={sec.heading} onChange={(v) => set({ heading: v })} />
          <Field title="Text" value={sec.body} textarea rows={12} hint="Tom rad ger nytt stycke. Rader som börjar med - blir en punktlista." onChange={(v) => set({ body: v })} />
        </>
      );
    case "summary": {
      const stats = doc.sections.filter((x): x is Stats => x.type === "stats");
      return (
        <>
          <Field title="Rubrik" value={sec.heading} onChange={(v) => set({ heading: v })} />
          <p className="bg-gray-50 px-3 py-2.5 text-[12.5px] text-gray-600">
            Sammanfattningen hämtar siffror från{" "}
            {stats.length ? (
              <>
                <b className="text-gray-900">{stats.length} statistiksid{stats.length === 1 ? "a" : "or"}</b>: {stats.map((x) => x.title || "Namnlös").join(", ")}
              </>
            ) : (
              "statistiksidorna, men det finns inga ännu"
            )}
            .
          </p>
          <KpiChips section={sec} title="Kolumner i sammanställningen" ops={ops} />
          <Check title="Visa nyckeltal överst" checked={sec.showTiles !== false} onChange={(v) => set({ showTiles: v })} />
          <Check title="Visa budget per plattform" checked={sec.showBudget !== false} onChange={(v) => set({ showBudget: v })} />
          <Check title="Visa höjdpunkter (räknas fram automatiskt)" checked={sec.showInsights !== false} onChange={(v) => set({ showInsights: v })} />
          <Field title="Slutsats" value={sec.conclusion} textarea rows={4} hint="Kort och konkret. Två–tre meningar får plats." onChange={(v) => set({ conclusion: v })} />
        </>
      );
    }
  }
}

export default function Inspector({ doc, sec, index, ops }: { doc: ReportDoc; sec: Section | null; index: number; ops: Ops }) {
  if (!sec) return <div className="p-8 text-gray-600">Lägg till en sektion för att börja bygga rapporten.</div>;
  const n = doc.sections.length;
  const tool = "w-8 h-8 grid place-items-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-35 disabled:hover:bg-transparent";
  return (
    <>
      <div className="sticky top-0 z-[2] flex justify-between items-center gap-3 px-[18px] py-3.5 bg-white border-b border-gray-200">
        <div>
          <div className="font-bold text-base">{SECTION_TYPES[sec.type].name}</div>
          <div className="text-xs text-gray-600">Sida {index + 1} av {n}</div>
        </div>
        <div className="flex gap-0.5">
          <button type="button" className={tool} aria-label="Flytta upp" title="Flytta upp" disabled={index === 0} onClick={() => ops.move(-1)}><ArrowUp className="w-4 h-4" aria-hidden /></button>
          <button type="button" className={tool} aria-label="Flytta ner" title="Flytta ner" disabled={index === n - 1} onClick={() => ops.move(1)}><ArrowDown className="w-4 h-4" aria-hidden /></button>
          <button type="button" className={tool} aria-label="Duplicera sektionen" title="Duplicera" onClick={ops.duplicate}><Copy className="w-4 h-4" aria-hidden /></button>
          <button type="button" className={`${tool} hover:!text-milou-600`} aria-label="Ta bort sektionen" title="Ta bort" onClick={ops.remove}><Trash2 className="w-4 h-4" aria-hidden /></button>
        </div>
      </div>
      <div key={sec.id} className="px-[18px] pt-4 pb-12 flex flex-col gap-4">
        <Body doc={doc} sec={sec} ops={ops} />
      </div>
    </>
  );
}
