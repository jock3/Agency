"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Plus } from "lucide-react";
import PageHeader, { PageHeaderButton } from "@/components/PageHeader";
import MediaplanTabs from "@/components/MediaplanTabs";
import MediaplanCrumbs from "@/components/mediaplan/MediaplanCrumbs";
import Steps from "@/components/mediaplan/Steps";
import FormModal from "@/components/mediaplan/FormModal";
import PlanCard from "@/components/dashboard/PlanCard";
import PlanOverlay from "@/components/plan-overlay/PlanOverlay";
import { usePlanReports } from "@/components/dashboard/usePlanReports";
import { createProjectPlan, deleteProject, getProject, updateProject } from "@/lib/api/hierarchy";
import { archivePlan, deletePlan } from "@/lib/api/plans";
import { formatKr, overlapsYear, rollup } from "@/lib/mediaplan/hierarchy";
import type { MediaPlan } from "@/lib/types";

type Data = NonNullable<Awaited<ReturnType<typeof getProject>>>;
const THIS_YEAR = new Date().getFullYear();
/** I år: dagens datum. Andra år: 1 januari. */
const defaultStart = (y: number) => (y === THIS_YEAR ? new Date().toISOString().slice(0, 10) : `${y}-01-01`);

export default function ProjectStep({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [year, setYear] = useState<number | null>(null);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const [modal, setModal] = useState<"campaign" | "edit" | null>(null);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { reportProps, reportUi } = usePlanReports();

  const load = useCallback(() => {
    getProject(id)
      .then((d) => { setData(d); setState(d ? "ok" : "missing"); })
      .catch(() => setState("error"));
  }, [id]);
  useEffect(load, [load]);

  const plans = useMemo(() => data?.plans ?? [], [data]);
  // År att välja mellan: årsplanernas år, åren kampanjerna pågår, i år och tillagda år.
  const years = useMemo(() => {
    const ys = new Set<number>([THIS_YEAR, ...extraYears]);
    for (const p of plans) {
      if (p.kind === "year" && p.plan_year) ys.add(p.plan_year);
      else for (let y = Number(p.period_start.slice(0, 4)); y <= Number(p.period_end.slice(0, 4)); y++) ys.add(y);
    }
    return [...ys].filter((y) => y >= 2000 && y <= 2100).sort((a, b) => a - b);
  }, [plans, extraYears]);
  const selected = year ?? (years.includes(THIS_YEAR) ? THIS_YEAR : years[years.length - 1]);

  const yearPlan = plans.find((p) => p.kind === "year" && p.plan_year === selected && !p.archived);
  const campaigns = plans.filter((p) => p.kind !== "year" && !p.archived && overlapsYear(p, selected));
  const archived = plans.filter((p) => p.archived && (p.kind === "year" ? p.plan_year === selected : overlapsYear(p, selected)));
  const sum = rollup([...(yearPlan ? [yearPlan] : []), ...campaigns]);

  async function createYearPlan() {
    setBusy(true);
    setError(null);
    try {
      const p = await createProjectPlan(id, { kind: "year", year: selected });
      load();
      setOpenPlan(p.id);
    } catch (e) {
      setError(e instanceof Error && e.message === "DUPLICATE" ? `Det finns redan en årsplan för ${selected}. Den kan vara arkiverad.` : "Årsplanen kunde inte skapas. Försök igen.");
    } finally {
      setBusy(false);
    }
  }

  const card = (p: MediaPlan, isArchived = false) => (
    <PlanCard
      key={p.id}
      plan={p}
      archived={isArchived}
      onOpen={() => setOpenPlan(p.id)}
      onArchive={async () => { await archivePlan(p.id, !isArchived); load(); }}
      onDelete={async () => { if (confirm(`Ta bort ${p.campaign_name}? Det går inte att ångra.`)) { await deletePlan(p.id); load(); } }}
      {...reportProps(p)}
    />
  );

  const project = data?.project;
  const client = data?.client;

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title={project?.name ?? "Projekt"}
        description={client ? `${client.name}${client.client_number ? ` · ${client.client_number}` : ""}` : undefined}
        action={project && <PageHeaderButton onClick={() => setModal("campaign")}>+ Ny kampanj</PageHeaderButton>}
      />
      <MediaplanTabs />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <MediaplanCrumbs items={[{ label: client?.name ?? "Kund", href: client ? `/mediaplan/kund/${client.id}` : undefined }, { label: project?.name ?? "Projekt" }]} />
        <Steps current={3} />
        {reportUi}

        {state === "missing" && <p className="bg-white px-5 py-4">Projektet finns inte. Det kan ha tagits bort.</p>}
        {state === "error" && <p role="alert" className="bg-white px-5 py-4 text-milou-600">Projektet kunde inte hämtas. Ladda om sidan.</p>}
        {state === "loading" && <div className="bg-white h-40 animate-pulse" />}

        {project && client && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-8" role="group" aria-label="År">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  aria-pressed={y === selected}
                  className={`h-9 px-4 text-sm font-bold ${y === selected ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-peach/40"}`}
                >
                  {y}
                </button>
              ))}
              <button
                onClick={() => { const next = years[years.length - 1] + 1; setExtraYears((e) => [...e, next]); setYear(next); }}
                className="h-9 px-3 text-sm text-gray-600 hover:text-milou-600 inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" aria-hidden /> Nästa år
              </button>
              {sum.plannedBudget > 0 && <span className="ml-auto text-sm text-gray-600">Planerad budget {selected}: <b className="text-gray-900">{formatKr(sum.plannedBudget)}</b></span>}
            </div>

            <section aria-labelledby="yearplan" className="mb-12">
              <h2 id="yearplan" className="text-xl font-bold mb-1">Årsplan {selected}</h2>
              <p className="text-sm text-gray-600 mb-4">Mediaplanen över hela året för {project.name}.</p>
              {error && <p role="alert" className="text-sm text-milou-600 mb-3">{error}</p>}
              {yearPlan ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">{card(yearPlan)}</div>
              ) : (
                <button
                  onClick={createYearPlan}
                  disabled={busy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-6 border-2 border-dashed border-gray-300 bg-white text-gray-700 font-semibold hover:border-milou-500 hover:text-milou-600 disabled:opacity-60"
                >
                  <CalendarPlus className="w-5 h-5" aria-hidden /> {busy ? "Skapar…" : `Skapa årsplan för ${selected}`}
                </button>
              )}
            </section>

            <section aria-labelledby="campaigns">
              <h2 id="campaigns" className="text-xl font-bold mb-1">Kampanjer {selected}</h2>
              <p className="text-sm text-gray-600 mb-4">Kampanjer som pågår någon gång under {selected}. En kampanj över årsskiftet syns båda åren.</p>
              {campaigns.length === 0 ? (
                <button
                  onClick={() => setModal("campaign")}
                  className="inline-flex items-center gap-2 h-12 px-5 border-2 border-dashed border-gray-300 bg-white text-gray-700 font-semibold hover:border-milou-500 hover:text-milou-600"
                >
                  <Plus className="w-5 h-5" aria-hidden /> Ny kampanj
                </button>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">{campaigns.map((p) => card(p))}</div>
              )}
            </section>

            {archived.length > 0 && (
              <section className="mt-12 opacity-70">
                <h2 className="text-sm font-bold text-gray-600 mb-4">Arkiverade {selected} ({archived.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">{archived.map((p) => card(p, true))}</div>
              </section>
            )}

            <div className="mt-12 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
              <button onClick={() => setModal("edit")} className="text-gray-700 hover:text-milou-600 hover:underline">Byt namn på projektet</button>
              <button onClick={async () => { await updateProject(project.id, { archived: !project.archived }); load(); }} className="text-gray-700 hover:text-milou-600 hover:underline">
                {project.archived ? "Återställ projektet" : "Arkivera projektet"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Ta bort projektet ${project.name}? Planerna tas inte bort, de flyttas till Osorterade.`)) return;
                  await deleteProject(project.id);
                  router.push(`/mediaplan/kund/${client.id}`);
                }}
                className="text-red-600 hover:underline"
              >
                Ta bort projektet
              </button>
            </div>
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
            { key: "start", label: "Startdatum", type: "date", required: true, initial: defaultStart(selected) },
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
