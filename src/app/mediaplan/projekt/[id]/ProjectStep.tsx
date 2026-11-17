"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, Plus, Trash2 } from "lucide-react";
import Hero from "@/components/mediaplan/Hero";
import Steps from "@/components/mediaplan/Steps";
import FormModal from "@/components/mediaplan/FormModal";
import YearPlan from "@/components/mediaplan/YearPlan";
import CampaignCard from "@/components/mediaplan/CampaignCard";
import ProjectPattern from "@/components/mediaplan/ProjectPattern";
import PlanOverlay from "@/components/plan-overlay/PlanOverlay";
import { usePlanReports } from "@/components/dashboard/usePlanReports";
import { createProjectPlan, deleteProject, getProject, updateProject } from "@/lib/api/hierarchy";
import { archivePlan, deletePlan } from "@/lib/api/plans";
import { formatKr, overlapsYear, rollup } from "@/lib/mediaplan/hierarchy";
import { campaignColor, type ColorName } from "@/lib/mediaplan/pattern";
import { campaignInfo, countFilters, matchesFilter, sortCampaigns, todayIso, visibleTags, type CampaignFilter } from "@/lib/mediaplan/schedule";
import type { MediaPlan } from "@/lib/types";

type Data = NonNullable<Awaited<ReturnType<typeof getProject>>>;

const textBtn = "inline-flex items-center gap-2 min-h-11 px-3.5 text-sm font-semibold bg-transparent hover:bg-[#E6E6E6] cursor-pointer";

/** Steg 3: projektets årsplan (kalender) och kampanjer, med filter och nedräkning. */
export default function ProjectStep({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [today] = useState(() => todayIso());
  const [year, setYear] = useState<number | null>(null);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const [filter, setFilter] = useState<CampaignFilter>("alla");
  const [hot, setHot] = useState<string | null>(null);
  const [modal, setModal] = useState<"campaign" | "edit" | null>(null);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const { reportProps, reportUi } = usePlanReports();

  const load = useCallback(() => {
    getProject(id).then((d) => { setData(d); setState(d ? "ok" : "missing"); }).catch(() => setState("error"));
  }, [id]);
  useEffect(load, [load]);

  const thisYear = Number(today.slice(0, 4));
  const plans = useMemo(() => data?.plans ?? [], [data]);
  const years = useMemo(() => {
    const ys = new Set<number>([thisYear, ...extraYears]);
    for (const p of plans) for (let y = Number(p.period_start.slice(0, 4)); y <= Number(p.period_end.slice(0, 4)); y++) ys.add(y);
    return [...ys].filter((y) => y >= 2000 && y <= 2100).sort((a, b) => a - b);
  }, [plans, extraYears, thisYear]);
  const selected = year ?? (years.includes(thisYear) ? thisYear : years[years.length - 1]);

  // Färgen följer kampanjens plats i skapandeordningen, så den ändras inte när andra läggs till eller filtreras bort.
  const colors = useMemo(() => {
    const order = [...plans].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    return Object.fromEntries(order.map((p, i) => [p.id, campaignColor(i)])) as Record<string, ColorName>;
  }, [plans]);

  const inYear = plans.filter((p) => !p.archived && overlapsYear(p, selected));
  const archived = plans.filter((p) => p.archived && overlapsYear(p, selected));
  const visible = useMemo(() => new Set(inYear.filter((p) => matchesFilter({ ...p, status: p.status }, filter, today)).map((p) => p.id)), [inYear, filter, today]);
  const cards = sortCampaigns(inYear, today).filter((p) => visible.has(p.id));
  const sum = rollup(inYear);
  const running = inYear.filter((p) => campaignInfo(p, today).state === "running").length;
  const approved = inYear.filter((p) => p.status === "approved").length;

  const project = data?.project;
  const client = data?.client;
  const crumbs = client && project ? [{ label: client.name, href: `/mediaplan/kund/${client.id}` }, { label: project.name }] : undefined;

  const cardFor = (p: MediaPlan) => (
    <CampaignCard
      key={p.id}
      plan={p}
      color={colors[p.id] ?? "red"}
      today={today}
      tags={visibleTags(p.tags, client?.name ?? "", project?.name ?? "")}
      dim={hot !== null && hot !== p.id}
      onHot={(on) => setHot(on ? p.id : null)}
      onOpen={() => setOpenPlan(p.id)}
      onArchive={async () => { await archivePlan(p.id, !p.archived); load(); }}
      onDelete={async () => { if (confirm(`Ta bort ${p.campaign_name}? Det går inte att ångra.`)) { await deletePlan(p.id); load(); } }}
      report={reportProps(p)}
    />
  );

  return (
    <div className="mp min-h-full bg-gray-50 text-gray-900">
      <Hero
        crumbs={crumbs}
        lead={project && <ProjectPattern projectId={project.id} round={project.pattern_round} size={104} className="shrink-0 max-[760px]:hidden" />}
        eyebrow="Projekt"
        title={project?.name ?? "Projekt"}
        subtitle={client ? <span className="text-base">{client.name}{client.client_number ? ` · Kundnr ${client.client_number}` : ""}</span> : undefined}
        action={project ? { label: "Ny kampanj", onClick: () => setModal("campaign") } : undefined}
        stats={project ? [
          { label: `Planerad budget ${selected}`, value: formatKr(sum.plannedBudget) },
          { label: "Kampanjer", value: inYear.length },
          { label: "Pågår just nu", value: <>{running}<span aria-hidden className={`w-3 h-3 rounded-full ${running ? "bg-[#E60330] mp-pulse" : "bg-gray-600"}`} /></> },
          { label: "Godkända", value: approved, suffix: ` av ${inYear.length}` },
        ] : undefined}
      />
      <main className="max-w-[1280px] mx-auto px-5 min-[761px]:px-10 pt-10 pb-[72px]">
        <Steps current={3} client={client ? { name: client.name, href: `/mediaplan/kund/${client.id}` } : undefined} project={project ? { name: project.name, href: "" } : undefined} />
        {reportUi}

        {state === "missing" && <p className="mt-10 bg-white px-6 py-5 font-semibold">Projektet finns inte. Det kan ha tagits bort.</p>}
        {state === "error" && <p role="alert" className="mt-10 bg-white px-6 py-5 font-semibold text-[#C8022A]">Projektet kunde inte hämtas. Ladda om sidan.</p>}
        {state === "loading" && <div className="mt-12 bg-white h-64 animate-pulse" />}

        {project && client && (
          <>
            <section aria-labelledby="arsplan" className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 id="arsplan" className="m-0 text-[30px] font-extrabold tracking-[-0.01em]">Årsplan {selected}</h2>
                  <p className="mt-1.5 mb-0 text-[15px] text-gray-600">Alla kampanjer i {project.name} över året. Klicka på ett block för att öppna kampanjens plan.</p>
                </div>
                <div role="group" aria-label="År" className="flex flex-wrap gap-2">
                  {years.map((y) => (
                    <button key={y} type="button" aria-pressed={y === selected} onClick={() => setYear(y)} className={`min-h-11 px-[18px] border-0 text-[15px] font-extrabold cursor-pointer ${y === selected ? "bg-gray-900 text-white" : "bg-white text-gray-900 hover:bg-[#E6E6E6]"}`}>{y}</button>
                  ))}
                  <button type="button" onClick={() => { const next = years[years.length - 1] + 1; setExtraYears((e) => [...e, next]); setYear(next); }} className="inline-flex items-center gap-2 min-h-11 px-4 border border-dashed border-[#8A8A8A] bg-transparent hover:border-gray-900 text-sm font-bold cursor-pointer">
                    <Plus aria-hidden className="w-4 h-4" strokeWidth={2} />Lägg till {years[years.length - 1] + 1}
                  </button>
                </div>
              </div>
              <YearPlan year={selected} plans={inYear} colors={colors} today={today} hot={hot} onHot={setHot} visible={visible} onOpen={setOpenPlan} />
            </section>

            <section aria-labelledby="kampanjrubrik" className="mt-14">
              <h2 id="kampanjrubrik" className="m-0 text-[30px] font-extrabold tracking-[-0.01em]">Kampanjer {selected}</h2>
              <p className="mt-1.5 mb-0 text-[15px] text-gray-600">Kampanjer som pågår någon gång under {selected}. En kampanj över årsskiftet syns båda åren.</p>
              <div role="group" aria-label="Filtrera kampanjer" className="flex flex-wrap gap-2 mt-5">
                {countFilters(inYear, today).map((f) => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`inline-flex items-center gap-2 min-h-10 pl-3.5 pr-2 border text-sm font-bold cursor-pointer ${filter === f.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900 border-[#BDBDBD] hover:border-gray-900"}`}>
                    {f.label}<span className={`min-w-6 h-6 px-1.5 inline-grid place-items-center text-xs font-extrabold ${filter === f.id ? "bg-[#E60330] text-white" : "bg-gray-50 text-gray-900"}`}>{f.n}</span>
                  </button>
                ))}
              </div>
              {inYear.length === 0 ? (
                <button type="button" onClick={() => setModal("campaign")} className="mt-6 inline-flex items-center gap-2 min-h-12 px-5 border-2 border-dashed border-[#BDBDBD] bg-white hover:border-gray-900 font-bold cursor-pointer">
                  <Plus aria-hidden className="w-5 h-5" />Ny kampanj
                </button>
              ) : cards.length === 0 ? (
                <p className="mt-6 p-7 border-2 border-dashed border-[#BDBDBD] text-[15px] font-semibold text-[#3D3D3D]">Inga kampanjer i det här filtret.</p>
              ) : (
                <div className="mt-6 grid gap-7 grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">{cards.map(cardFor)}</div>
              )}
              {archived.length > 0 && (
                <div className="mt-12">
                  <h3 className="m-0 mb-4 text-sm font-bold text-gray-600">Arkiverade {selected} ({archived.length})</h3>
                  <div className="grid gap-7 grid-cols-[repeat(auto-fill,minmax(270px,1fr))] opacity-70">{archived.map(cardFor)}</div>
                </div>
              )}
            </section>

            <section aria-labelledby="projinst" className="mt-14 pt-6 border-t border-[#D6D6D6] flex flex-wrap items-center justify-between gap-4">
              <h2 id="projinst" className="m-0 text-[13px] font-bold tracking-[0.1em] uppercase text-gray-600">Projektinställningar</h2>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setModal("edit")} className={textBtn}><Pencil aria-hidden className="w-4 h-4" strokeWidth={1.8} />Byt namn på projektet</button>
                <button type="button" onClick={async () => { await updateProject(project.id, { archived: !project.archived }); load(); }} className={textBtn}><Archive aria-hidden className="w-4 h-4" strokeWidth={1.8} />{project.archived ? "Återställ projektet" : "Arkivera projektet"}</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Ta bort projektet ${project.name}? Planerna tas inte bort, de flyttas till Osorterade.`)) return;
                    await deleteProject(project.id);
                    router.push(`/mediaplan/kund/${client.id}`);
                  }}
                  className={`${textBtn} !text-[#C8022A] font-bold hover:!bg-[#FFDED0]`}
                ><Trash2 aria-hidden className="w-4 h-4" strokeWidth={1.8} />Ta bort projektet</button>
              </div>
            </section>
          </>
        )}
      </main>

      {openPlan && <PlanOverlay planId={openPlan} onClose={() => { setOpenPlan(null); load(); }} />}

      {modal === "campaign" && project && client && (
        <FormModal
          title={`Ny kampanj i ${project.name}`}
          intro={<>Kampanjen får taggarna <b>{client.name}</b>, <b>{project.name}</b> och kampanjens namn automatiskt.</>}
          fields={[
            { key: "name", label: "Kampanjens namn", required: true, placeholder: "Till exempel: Julkampanj", maxLength: 160 },
            { key: "start", label: "Startdatum", type: "date", required: true, initial: selected === thisYear ? today : `${selected}-01-01` },
            { key: "end", label: "Slutdatum", type: "date", required: true, initial: `${selected}-12-31` },
          ]}
          submitLabel="Skapa kampanj"
          onClose={() => setModal(null)}
          onSubmit={async (v) => {
            const p = await createProjectPlan(project.id, { kind: "campaign", name: v.name, start: v.start, end: v.end });
            setModal(null);
            load();
            setOpenPlan(p.id);
          }}
        />
      )}
      {modal === "edit" && project && (
        <FormModal
          title="Byt namn på projektet"
          intro="Taggen på projektets alla planer och rapporter uppdateras."
          fields={[{ key: "name", label: "Projektets namn", required: true, initial: project.name }]}
          submitLabel="Spara"
          onClose={() => setModal(null)}
          onSubmit={async (v) => { await updateProject(project.id, { name: v.name }); setModal(null); load(); }}
        />
      )}
    </div>
  );
}
