"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { PLATFORMS, findPlatform } from "@/lib/platforms";
import { fmtInt, fmtKr, fmtNum, fmtPct, kpis, parseRows, totalsOf, type ReportRow } from "@/lib/social/report";

interface Props {
  companyId: string;
  report: { id: string; title: string; periodStart: string; periodEnd: string; rows: ReportRow[] };
}

/** Raden som text i fälten, så att man kan skriva "1 200" eller "12,5" utan att fältet hoppar. */
interface Draft {
  platform: string;
  reach: string;
  impressions: string;
  clicks: string;
  spend: string;
}

const toDraft = (r: ReportRow): Draft => ({
  platform: r.platform,
  reach: String(r.reach),
  impressions: String(r.impressions),
  clicks: String(r.clicks),
  spend: String(r.spend),
});

const ERRORS: Record<string, string> = {
  INVALID_TITLE: "Rubriken måste vara 1–120 tecken.",
  INVALID_PERIOD: "Slutdatum får inte vara före startdatum.",
  INVALID_ROWS: "Kontrollera siffrorna: de måste vara tal, och klick kan inte vara fler än exponeringar.",
};
const FALLBACK = "Något gick fel. Försök igen.";

const field = "border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-milou-500";

export default function ReportEditor({ companyId, report }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(report.title);
  const [start, setStart] = useState(report.periodStart);
  const [end, setEnd] = useState(report.periodEnd);
  const [drafts, setDrafts] = useState<Draft[]>(report.rows.map(toDraft));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const edit = (fn: () => void) => {
    fn();
    setDirty(true);
    setMessage(null);
  };
  const setField = (i: number, key: keyof Draft, value: string) => edit(() => setDrafts((d) => d.map((r, j) => (j === i ? { ...r, [key]: value } : r))));

  // Live-siffror från det som står i fälten. Ogiltiga rader räknas inte förrän de är rättade.
  const parsed = useMemo(() => parseRows(drafts), [drafts]);
  const rows = parsed ?? [];
  const total = kpis(totalsOf(rows));
  const maxImpressions = Math.max(1, ...rows.map((r) => r.impressions));
  const unused = PLATFORMS.filter((p) => !drafts.some((d) => findPlatform(d.platform)?.key === p.key));

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/social/rapport/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, periodStart: start, periodEnd: end, rows: drafts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMessage({ ok: false, text: ERRORS[data.error] ?? FALLBACK });
      else {
        setDirty(false);
        setMessage({ ok: true, text: "Sparat." });
      }
    } catch {
      setMessage({ ok: false, text: FALLBACK });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Ta bort rapporten? Det går inte att ångra.")) return;
    const res = await fetch(`/api/social/rapport/${report.id}`, { method: "DELETE" });
    if (res.ok) router.push(`/social/rapport/${companyId}`);
    else setMessage({ ok: false, text: FALLBACK });
  }

  const cards: { label: string; value: string; note?: string }[] = [
    { label: "Räckvidd", value: fmtInt(total.reach), note: rows.length > 1 ? "Summa, kan innehålla dubbelräknade personer" : undefined },
    { label: "Exponeringar", value: fmtInt(total.impressions) },
    { label: "Klick", value: fmtInt(total.clicks) },
    { label: "CTR", value: fmtPct(total.ctr) },
    { label: "CPC", value: fmtKr(total.cpc) },
    { label: "CPM", value: fmtKr(total.cpm) },
  ];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm flex-1 min-w-60">
          <span className="block text-gray-600 mb-1">Rubrik</span>
          <input value={title} onChange={(e) => edit(() => setTitle(e.target.value))} maxLength={120} className={`${field} w-full text-lg font-bold`} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Från</span>
          <input type="date" value={start} onChange={(e) => edit(() => setStart(e.target.value))} className={field} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Till</span>
          <input type="date" value={end} onChange={(e) => edit(() => setEnd(e.target.value))} className={field} />
        </label>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 text-sm font-bold bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-4 py-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
          Spara
        </button>
      </div>
      <p role="status" className={`mt-2 text-sm empty:hidden ${message?.ok ? "text-gray-700" : "text-milou-600"}`}>
        {message?.text ?? (dirty ? "Osparade ändringar." : "")}
      </p>

      <section className="mt-6" aria-label="Nyckeltal totalt">
        <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="bg-white px-4 py-3 border-t-4 border-black">
              <dt className="text-xs text-gray-600">{c.label}</dt>
              <dd className="text-2xl font-bold mt-1">{c.value}</dd>
              {c.note && <p className="text-[11px] text-gray-600 mt-1">{c.note}</p>}
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h3 className="font-bold mb-2">Siffror per plattform</h3>
        <div className="bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 font-medium">Plattform</th>
                <th className="px-3 py-2 font-medium">Räckvidd</th>
                <th className="px-3 py-2 font-medium">Exponeringar</th>
                <th className="px-3 py-2 font-medium">Klick</th>
                <th className="px-3 py-2 font-medium">Kostnad (kr)</th>
                <th className="px-3 py-2 font-medium text-right">CTR</th>
                <th className="px-3 py-2 font-medium text-right">CPC</th>
                <th className="px-3 py-2 font-medium text-right">CPM</th>
                <th className="px-3 py-2"><span className="sr-only">Ta bort</span></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => {
                const p = findPlatform(d.platform);
                const k = parsed ? kpis(parsed[i]) : null;
                return (
                  <tr key={i} className="border-b border-gray-100" style={{ borderLeft: `8px solid ${p?.color ?? "#999"}` }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap">{d.platform}</td>
                    {(["reach", "impressions", "clicks", "spend"] as const).map((key) => (
                      <td key={key} className="px-3 py-2">
                        <input
                          inputMode="decimal"
                          aria-label={`${d.platform}: ${key === "reach" ? "räckvidd" : key === "impressions" ? "exponeringar" : key === "clicks" ? "klick" : "kostnad"}`}
                          value={d[key]}
                          onChange={(e) => setField(i, key, e.target.value)}
                          className={`${field} w-28`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(k?.ctr ?? null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtKr(k?.cpc ?? null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtKr(k?.cpm ?? null)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => edit(() => setDrafts((all) => all.filter((_, j) => j !== i)))} aria-label={`Ta bort ${d.platform}`} className="text-gray-600 hover:text-milou-600">
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {drafts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-gray-700">Ingen plattform än. Lägg till en nedan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!parsed && drafts.length > 0 && (
          <p role="alert" className="mt-2 text-sm text-milou-600">
            Någon siffra är inte ett tal, eller så har en plattform fler klick än exponeringar. Totalen visas när det är rättat.
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="add-platform" className="sr-only">Lägg till plattform</label>
          <select
            id="add-platform"
            value=""
            onChange={(e) => e.target.value && edit(() => setDrafts((d) => [...d, { platform: e.target.value, reach: "0", impressions: "0", clicks: "0", spend: "0" }]))}
            disabled={unused.length === 0 || drafts.length >= 20}
            className={field}
          >
            <option value="">+ Lägg till plattform</option>
            {unused.map((p) => (
              <option key={p.key} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="mt-8" aria-label="Jämförelse mellan plattformar">
          <h3 className="font-bold mb-2">Exponeringar per plattform</h3>
          <ul className="bg-white p-4 space-y-3">
            {rows.map((r) => (
              <li key={r.platform} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3 text-sm">
                <span className="font-bold truncate">{r.platform}</span>
                <span className="h-5 bg-gray-100">
                  <span className="block h-full" style={{ width: `${(r.impressions / maxImpressions) * 100}%`, background: findPlatform(r.platform)?.color ?? "#999" }} />
                </span>
                <span className="text-right tabular-nums">{fmtNum(r.impressions)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <button onClick={remove} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-milou-600">
          <Trash2 className="w-4 h-4" aria-hidden /> Ta bort rapporten
        </button>
      </div>
    </div>
  );
}
