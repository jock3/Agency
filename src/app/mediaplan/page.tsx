"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutGrid, List, Plus, Search } from "lucide-react";
import Hero from "@/components/mediaplan/Hero";
import Steps from "@/components/mediaplan/Steps";
import PlateCard from "@/components/mediaplan/PlateCard";
import FormModal from "@/components/mediaplan/FormModal";
import { createClient, listClients, type ClientSummary } from "@/lib/api/hierarchy";
import { clientAccent, HEX, initials } from "@/lib/mediaplan/pattern";

const VIEW_KEY = "mediaplan-kundvy";

/** Steg 1: välj kund. Ingen budget på kundnivå, den hör till projekten. */
export default function ClientsStep() {
  const router = useRouter();
  const [data, setData] = useState<{ clients: ClientSummary[]; unsorted: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(() => { listClients().then(setData).catch(() => setFailed(true)); }, []);
  useEffect(load, [load]);
  // Kom ihåg valet av vy i den här webbläsaren.
  useEffect(() => { try { if (localStorage.getItem(VIEW_KEY) === "list") setView("list"); } catch { /* ingen lagring */ } }, []);
  const pickView = (v: "cards" | "list") => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ingen lagring */ } };

  const needle = q.trim().toLowerCase();
  const all = useMemo(() => data?.clients ?? [], [data]);
  const active = all.filter((c) => !c.archived);
  const match = (c: ClientSummary) => !needle || c.name.toLowerCase().includes(needle) || c.client_number.toLowerCase().includes(needle);
  const shown = active.filter(match);
  const archived = all.filter((c) => c.archived && match(c));
  const totals = { customers: active.length, projects: active.reduce((a, c) => a + c.projects, 0), campaigns: active.reduce((a, c) => a + c.rollup.plans, 0) };
  const count = needle ? `Visar ${shown.length} av ${active.length} kunder` : `${active.length} ${active.length === 1 ? "kund" : "kunder"}`;
  const go = (c: ClientSummary) => `/mediaplan/kund/${c.id}`;

  const arrow = (c: ClientSummary, size: number) => (
    <Link href={go(c)} aria-label={`Visa projekt för ${c.name}`} className="grid place-items-center bg-[#E60330] text-white group-hover:bg-[#C8022A] hover:bg-[#C8022A] shrink-0" style={{ width: size, height: size }}>
      <ArrowRight aria-hidden className="w-[18px] h-[18px]" strokeWidth={2} />
    </Link>
  );

  return (
    <div className="mp min-h-full bg-gray-50 text-gray-900">
      <Hero
        title="Mediaplaner"
        subtitle="Välj kund, sedan projekt. I projektet ligger årets mediaplan och projektets kampanjer."
        action={{ label: "Ny kund", onClick: () => setCreating(true) }}
        stats={[{ label: "Kunder", value: totals.customers }, { label: "Projekt", value: totals.projects }, { label: "Kampanjer", value: totals.campaigns }]}
      />
      <main className="max-w-[1280px] mx-auto px-5 min-[761px]:px-10 pt-10 pb-20">
        <Steps current={1} />

        <div className="flex flex-wrap items-center justify-between gap-4 mt-9">
          <div className="flex flex-wrap items-center gap-[18px] flex-1 basis-[420px]">
            <label htmlFor="kundsok" className="sr-only">Sök kund</label>
            <div className="relative flex-[0_1_440px] min-w-[240px]">
              <Search aria-hidden className="absolute left-4 top-4 w-[18px] h-[18px] text-gray-600" strokeWidth={1.8} />
              <input
                id="kundsok" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
                placeholder="Sök på kundnamn eller kundnummer"
                className="w-full h-[50px] pl-[46px] pr-4 border border-[#BDBDBD] bg-white text-[15px] rounded-none placeholder:text-gray-600 focus:border-gray-900 focus:outline-none focus:ring-[3px] focus:ring-[#FCBEB7]"
              />
            </div>
            <span role="status" className="text-sm font-semibold text-gray-600">{data ? count : ""}</span>
            {data && data.unsorted > 0 && <Link href="/mediaplan/osorterade" className="text-sm font-bold text-[#C8022A] hover:underline">Osorterade planer ({data.unsorted})</Link>}
          </div>
          <div role="group" aria-label="Visa som" className="flex border border-gray-900">
            {([["cards", "Kort", LayoutGrid], ["list", "Lista", List]] as const).map(([id, label, Icon], i) => (
              <button key={id} type="button" aria-pressed={view === id} onClick={() => pickView(id)} className={`inline-flex items-center gap-2 min-h-11 px-4 text-sm font-bold cursor-pointer ${i ? "border-l border-gray-900" : ""} ${view === id ? "bg-gray-900 text-white" : "bg-white text-gray-900 hover:bg-gray-50"}`}>
                <Icon aria-hidden className="w-4 h-4" strokeWidth={1.8} />{label}
              </button>
            ))}
          </div>
        </div>

        {failed && <p role="alert" className="mt-8 bg-white px-6 py-5 font-semibold text-[#C8022A]">Kunderna kunde inte hämtas. Ladda om sidan.</p>}
        {!data && !failed && <div className="mt-8 grid gap-8 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">{[0, 1, 2].map((i) => <div key={i} className="bg-white h-[250px] animate-pulse" />)}</div>}

        {data && shown.length === 0 && active.length > 0 && (
          <div className="mt-8 p-8 min-[761px]:p-12 bg-white border-2 border-dashed border-[#BDBDBD] flex flex-col items-start gap-3.5">
            <p className="m-0 text-xl font-extrabold">Ingen kund matchar ”{q}”</p>
            <p className="m-0 text-[15px] text-gray-600">Kontrollera stavningen eller sök på kundnummer, till exempel BB-001.</p>
            <button type="button" onClick={() => setQ("")} className="min-h-[46px] px-5 bg-[#E60330] hover:bg-[#C8022A] text-white text-[15px] font-extrabold">Rensa sökningen</button>
          </div>
        )}

        {data && view === "cards" && (shown.length > 0 || active.length === 0 || !needle) && (
          <div className="mt-8 grid gap-8 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {shown.map((c) => {
              const accent = HEX[clientAccent(c.rank)];
              return (
                <PlateCard key={c.id} color={accent} cardClassName="p-6 pt-[26px] flex flex-col gap-[22px] min-h-[250px]">
                  <div className="flex items-center gap-3.5">
                    <span aria-hidden className="w-12 h-12 grid place-items-center text-[17px] font-extrabold shrink-0" style={{ background: accent }}>{initials(c.name)}</span>
                    <div className="min-w-0">
                      <h2 className="m-0 text-[21px] leading-[1.15] font-extrabold break-words">{c.name}</h2>
                      <p className="mt-1 mb-0 text-[13px] text-gray-600 tracking-[0.03em]">{c.client_number ? `Kundnr ${c.client_number}` : "Inget kundnummer"}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 m-0 pt-[18px] border-t border-[#E6E6E6]">
                    <div><dt className="text-xs font-semibold text-gray-600">Projekt</dt><dd className="m-0 mt-1 text-[32px] font-extrabold leading-[1.1]">{c.projects}</dd></div>
                    <div><dt className="text-xs font-semibold text-gray-600">Kampanjer</dt><dd className="m-0 mt-1 text-[32px] font-extrabold leading-[1.1]">{c.rollup.plans}</dd></div>
                  </dl>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">Visa projekt</span>
                    {arrow(c, 46)}
                  </div>
                </PlateCard>
              );
            })}
            <button type="button" onClick={() => setCreating(true)} className="min-h-[250px] mr-3 mb-3 border-2 border-dashed border-[#BDBDBD] bg-transparent hover:border-gray-900 hover:bg-white flex flex-col items-center justify-center gap-3 p-6 cursor-pointer">
              <span aria-hidden className="w-[46px] h-[46px] grid place-items-center bg-gray-900 text-white"><Plus className="w-[18px] h-[18px]" strokeWidth={2.2} /></span>
              <span className="text-[17px] font-extrabold">Lägg till kund</span>
              <span className="text-[13px] text-gray-600">Kundnamn och kundnummer</span>
            </button>
          </div>
        )}

        {data && view === "list" && shown.length > 0 && (
          <div className="mt-8 bg-white overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[15px]">
              <thead>
                <tr>
                  {[["Kund", "left"], ["Kundnr", "left"], ["Projekt", "right"], ["Kampanjer", "right"]].map(([h, a]) => (
                    <th key={h} scope="col" className={`px-6 py-4 text-xs font-bold tracking-[0.06em] uppercase text-gray-600 border-b-2 border-gray-900 text-${a}`}>{h}</th>
                  ))}
                  <th scope="col" className="px-6 py-4 border-b-2 border-gray-900"><span className="sr-only">Öppna</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-6 py-4 border-b border-[#ECECEC]">
                      <span className="flex items-center gap-3.5">
                        <span aria-hidden className="w-9 h-9 grid place-items-center text-[13px] font-extrabold shrink-0" style={{ background: HEX[clientAccent(c.rank)] }}>{initials(c.name)}</span>
                        <strong className="text-base font-extrabold">{c.name}</strong>
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-[#ECECEC] text-gray-600 tracking-[0.03em]">{c.client_number}</td>
                    <td className="px-6 py-4 border-b border-[#ECECEC] text-right font-semibold">{c.projects}</td>
                    <td className="px-6 py-4 border-b border-[#ECECEC] text-right font-semibold">{c.rollup.plans}</td>
                    <td className="px-6 py-2.5 border-b border-[#ECECEC] text-right w-[1%]">{arrow(c, 44)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {archived.length > 0 && (
          <div className="mt-12">
            <button onClick={() => setShowArchived((v) => !v)} className="text-sm font-semibold text-gray-600 hover:text-gray-900 min-h-11" aria-expanded={showArchived}>
              {showArchived ? "▾" : "▸"} Arkiverade kunder ({archived.length})
            </button>
            {showArchived && (
              <ul className="list-none m-0 p-0 mt-2 flex flex-wrap gap-3">
                {archived.map((c) => <li key={c.id}><Link href={go(c)} className="inline-block bg-white px-4 py-3 text-sm font-bold text-gray-600 hover:text-gray-900">{c.name}</Link></li>)}
              </ul>
            )}
          </div>
        )}
      </main>

      {creating && (
        <FormModal
          title="Ny kund"
          intro="Planer och kampanjer under kunden får kundens namn som tagg automatiskt."
          fields={[
            { key: "name", label: "Kundens namn", required: true, placeholder: "Till exempel: Region Gotland" },
            { key: "number", label: "Kundnummer", placeholder: "Till exempel: G-001", maxLength: 40 },
          ]}
          submitLabel="Skapa kund"
          onClose={() => setCreating(false)}
          onSubmit={async (v) => { const c = await createClient({ name: v.name, clientNumber: v.number }); router.push(`/mediaplan/kund/${c.id}`); }}
        />
      )}
    </div>
  );
}
