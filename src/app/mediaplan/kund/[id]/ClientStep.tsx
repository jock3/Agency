"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowRight, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";
import Hero from "@/components/mediaplan/Hero";
import Steps from "@/components/mediaplan/Steps";
import PlateCard from "@/components/mediaplan/PlateCard";
import ProjectPattern from "@/components/mediaplan/ProjectPattern";
import FormModal from "@/components/mediaplan/FormModal";
import { createProject, deleteClient, getClient, shufflePattern, updateClient } from "@/lib/api/hierarchy";
import { formatKr } from "@/lib/mediaplan/hierarchy";
import { clientAccent, HEX, initials } from "@/lib/mediaplan/pattern";

type Data = NonNullable<Awaited<ReturnType<typeof getClient>>>;

const textBtn = "inline-flex items-center gap-2 min-h-11 px-3.5 text-sm font-semibold bg-transparent hover:bg-[#E6E6E6] cursor-pointer";

/** Steg 2: kundens projekt som affischer, med projektets mönster. Ingen budget i heron. */
export default function ClientStep({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [modal, setModal] = useState<"project" | "edit" | null>(null);
  const [rounds, setRounds] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    getClient(id).then((d) => { setData(d); setState(d ? "ok" : "missing"); }).catch(() => setState("error"));
  }, [id]);
  useEffect(load, [load]);

  const client = data?.client;
  const projects = (data?.projects ?? []).filter((p) => !p.archived);
  const accent = HEX[clientAccent(data?.rank ?? 0)];
  const campaigns = projects.reduce((a, p) => a + p.rollup.plans, 0);

  async function shuffle(projectId: string, current: number) {
    setRounds((r) => ({ ...r, [projectId]: current + 1 }));
    try { await shufflePattern(projectId); } catch { setRounds((r) => ({ ...r, [projectId]: current })); }
  }
  async function archive() { if (client) { await updateClient(client.id, { archived: !client.archived }); load(); } }
  async function remove() {
    if (!client) return;
    if (!confirm(`Ta bort ${client.name} och kundens ${data?.projects.length ?? 0} projekt? Planerna tas inte bort, de flyttas till Osorterade.`)) return;
    await deleteClient(client.id);
    router.push("/mediaplan");
  }

  return (
    <div className="mp min-h-full bg-gray-50 text-gray-900">
      <Hero
        crumbs={[{ label: client?.name ?? "Kund" }]}
        lead={client && <span aria-hidden className="w-[84px] h-[84px] grid place-items-center shrink-0 text-[30px] font-extrabold text-gray-900" style={{ background: accent }}>{initials(client.name)}</span>}
        title={client?.name ?? "Kund"}
        titleSize={64}
        subtitle={client ? <span className="text-base">{[client.client_number && `Kundnr ${client.client_number}`, `${projects.length} ${projects.length === 1 ? "projekt" : "projekt"}`, `${campaigns} ${campaigns === 1 ? "kampanj" : "kampanjer"}`].filter(Boolean).join(" · ")}</span> : undefined}
        action={client ? { label: "Nytt projekt", onClick: () => setModal("project") } : undefined}
      />
      <main className="max-w-[1280px] mx-auto px-5 min-[761px]:px-10 pt-10 pb-[72px]">
        <Steps current={2} client={client ? { name: client.name, href: `/mediaplan/kund/${client.id}` } : undefined} />

        {state === "missing" && <p className="mt-10 bg-white px-6 py-5 font-semibold">Kunden finns inte. Den kan ha tagits bort.</p>}
        {state === "error" && <p role="alert" className="mt-10 bg-white px-6 py-5 font-semibold text-[#C8022A]">Kunden kunde inte hämtas. Ladda om sidan.</p>}
        {state === "loading" && <div className="mt-11 bg-white h-[340px] animate-pulse" />}

        {client && (
          <>
            {client.archived && <p className="mt-8 bg-white border-l-4 border-gray-600 px-4 py-3 text-sm">Kunden är arkiverad. Den syns under Arkiverade kunder.</p>}
            <div className="flex items-baseline gap-3.5 mt-11">
              <h2 className="m-0 text-[30px] font-extrabold tracking-[-0.01em]">Projekt</h2>
              <span className="text-sm font-semibold text-gray-600">{projects.length} {projects.length === 1 ? "projekt" : "projekt"}</span>
            </div>

            <div className="flex flex-wrap gap-8 mt-[22px] items-stretch">
              {projects.map((p) => {
                const round = rounds[p.id] ?? p.pattern_round;
                const pips = Math.min(p.rollup.plans, 12);
                return (
                  <PlateCard key={p.id} color={accent} offset={14} lift={5} className="flex-[2_1_640px] min-w-0" cardClassName="flex flex-wrap">
                    <div className="flex-[0_0_340px] max-w-full relative overflow-hidden">
                      <ProjectPattern projectId={p.id} round={round} grow />
                      <button type="button" onClick={() => shuffle(p.id, round)} className="absolute right-3 bottom-3 inline-flex items-center gap-2 min-h-10 px-3.5 border-0 bg-white text-gray-900 hover:bg-gray-900 hover:text-white text-[13px] font-bold cursor-pointer">
                        <Shuffle aria-hidden className="w-4 h-4" strokeWidth={1.8} />Blanda mönster<span className="sr-only"> för {p.name}</span>
                      </button>
                    </div>
                    <div className="flex-[1_1_300px] min-w-0 p-8 pt-[34px] pb-[30px] flex flex-col gap-[26px]">
                      <div>
                        <p className="m-0 text-[13px] font-bold tracking-[0.1em] uppercase text-[#C8022A]">Projekt</p>
                        <h3 className="mt-2 mb-0 text-[40px] min-[761px]:text-[52px] leading-none font-extrabold tracking-[-0.025em] break-words">{p.name}</h3>
                      </div>
                      <dl className="grid grid-cols-2 gap-5 m-0 pt-[22px] border-t border-[#E6E6E6]">
                        <div>
                          <dt className="text-[13px] font-semibold text-gray-600">Planerad budget</dt>
                          <dd className="m-0 mt-1.5 text-[26px] min-[761px]:text-[30px] font-extrabold leading-[1.1] tracking-[-0.01em] whitespace-nowrap">{formatKr(p.rollup.plannedBudget)}</dd>
                        </div>
                        <div>
                          <dt className="text-[13px] font-semibold text-gray-600">Kampanjer</dt>
                          <dd className="m-0 mt-1.5 flex items-center gap-3">
                            <span className="text-[30px] font-extrabold leading-[1.1]">{p.rollup.plans}</span>
                            <span aria-hidden className="flex gap-[5px]">{Array.from({ length: pips }, (_, i) => <span key={i} className="w-3.5 h-3.5 bg-[#E60330]" />)}</span>
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-auto flex items-center justify-between gap-3">
                        <span className="text-[15px] font-bold">Öppna årsplan och kampanjer</span>
                        <Link href={`/mediaplan/projekt/${p.id}`} aria-label={`Öppna ${p.name}`} className="w-[52px] h-[52px] grid place-items-center bg-[#E60330] hover:bg-[#C8022A] group-hover:bg-[#C8022A] text-white shrink-0">
                          <ArrowRight aria-hidden className="w-5 h-5" strokeWidth={2} />
                        </Link>
                      </div>
                    </div>
                  </PlateCard>
                );
              })}
              <button type="button" onClick={() => setModal("project")} className="flex-[1_1_280px] min-h-[340px] mr-3.5 mb-3.5 border-2 border-dashed border-[#BDBDBD] bg-transparent hover:border-gray-900 hover:bg-white flex flex-col items-center justify-center gap-3 p-7 text-center cursor-pointer">
                <span aria-hidden className="w-[52px] h-[52px] grid place-items-center bg-gray-900 text-white"><Plus className="w-5 h-5" strokeWidth={2.2} /></span>
                <span className="text-[19px] font-extrabold">Nytt projekt</span>
                <span className="text-sm leading-normal text-gray-600 max-w-[220px]">Varje projekt får ett eget mönster</span>
              </button>
            </div>

            <section aria-labelledby="kundinst" className="mt-14 pt-6 border-t border-[#D6D6D6] flex flex-wrap items-center justify-between gap-4">
              <h2 id="kundinst" className="m-0 text-[13px] font-bold tracking-[0.1em] uppercase text-gray-600">Kundinställningar</h2>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setModal("edit")} className={textBtn}><Pencil aria-hidden className="w-4 h-4" strokeWidth={1.8} />Ändra namn eller kundnummer</button>
                <button type="button" onClick={archive} className={textBtn}><Archive aria-hidden className="w-4 h-4" strokeWidth={1.8} />{client.archived ? "Återställ kunden" : "Arkivera kunden"}</button>
                <button type="button" onClick={remove} className={`${textBtn} !text-[#C8022A] font-bold hover:!bg-[#FFDED0]`}><Trash2 aria-hidden className="w-4 h-4" strokeWidth={1.8} />Ta bort kunden</button>
              </div>
            </section>
          </>
        )}
      </main>

      {modal === "project" && client && (
        <FormModal
          title={`Nytt projekt för ${client.name}`}
          intro="Projektets planer får kundens och projektets namn som taggar automatiskt."
          fields={[{ key: "name", label: "Projektets namn", required: true, placeholder: "Till exempel: Vattenkampanj" }]}
          submitLabel="Skapa projekt"
          onClose={() => setModal(null)}
          onSubmit={async (v) => { const p = await createProject(client.id, v.name); router.push(`/mediaplan/projekt/${p.id}`); }}
        />
      )}
      {modal === "edit" && client && (
        <FormModal
          title="Ändra kund"
          intro="Byter du namn uppdateras taggen på kundens alla planer och rapporter."
          fields={[
            { key: "name", label: "Kundens namn", required: true, initial: client.name },
            { key: "number", label: "Kundnummer", initial: client.client_number, maxLength: 40 },
          ]}
          submitLabel="Spara"
          onClose={() => setModal(null)}
          onSubmit={async (v) => { await updateClient(client.id, { name: v.name, clientNumber: v.number }); setModal(null); load(); }}
        />
      )}
    </div>
  );
}
