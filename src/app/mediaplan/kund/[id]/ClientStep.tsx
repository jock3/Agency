"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader, { PageHeaderButton } from "@/components/PageHeader";
import MediaplanTabs from "@/components/MediaplanTabs";
import MediaplanCrumbs from "@/components/mediaplan/MediaplanCrumbs";
import Steps from "@/components/mediaplan/Steps";
import LevelCard from "@/components/mediaplan/LevelCard";
import FormModal from "@/components/mediaplan/FormModal";
import { createProject, deleteClient, getClient, updateClient } from "@/lib/api/hierarchy";
import { rollup, formatKr } from "@/lib/mediaplan/hierarchy";

type Data = NonNullable<Awaited<ReturnType<typeof getClient>>>;

export default function ClientStep({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [modal, setModal] = useState<"project" | "edit" | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(() => {
    getClient(id)
      .then((d) => { setData(d); setState(d ? "ok" : "missing"); })
      .catch(() => setState("error"));
  }, [id]);
  useEffect(load, [load]);

  const client = data?.client;
  const active = (data?.projects ?? []).filter((p) => !p.archived);
  const archived = (data?.projects ?? []).filter((p) => p.archived);
  const total = rollup([]); // tom summering som bas
  for (const p of active) { total.plannedBudget += p.rollup.plannedBudget; total.plans += p.rollup.plans; }

  async function archive() {
    if (!client) return;
    await updateClient(client.id, { archived: !client.archived });
    load();
  }
  async function remove() {
    if (!client) return;
    if (!confirm(`Ta bort ${client.name} och kundens ${data?.projects.length ?? 0} projekt? Planerna tas inte bort, de flyttas till Osorterade.`)) return;
    await deleteClient(client.id);
    router.push("/mediaplan");
  }

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title={client?.name ?? "Kund"}
        description={client ? [client.client_number, total.plannedBudget > 0 ? `Planerad budget ${formatKr(total.plannedBudget)}` : ""].filter(Boolean).join(" · ") || "Välj ett projekt eller skapa ett nytt." : undefined}
        action={client && <PageHeaderButton onClick={() => setModal("project")}>+ Nytt projekt</PageHeaderButton>}
      />
      <MediaplanTabs />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <MediaplanCrumbs items={[{ label: client?.name ?? "Kund" }]} />
        <Steps current={2} />

        {state === "missing" && <p className="bg-white px-5 py-4">Kunden finns inte. Den kan ha tagits bort.</p>}
        {state === "error" && <p role="alert" className="bg-white px-5 py-4 text-milou-600">Kunden kunde inte hämtas. Ladda om sidan.</p>}
        {state === "loading" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">{[0, 1, 2].map((i) => <div key={i} className="bg-white h-36 animate-pulse" />)}</div>}

        {client && (
          <>
            {client.archived && <p className="bg-white border-l-4 border-gray-400 px-4 py-3 text-sm mb-6">Kunden är arkiverad och syns under Arkiverade kunder.</p>}
            {active.length === 0 ? (
              <div className="bg-white px-6 py-10 text-center text-gray-600">Inga projekt än. Klicka på &quot;+ Nytt projekt&quot;, till exempel &quot;Varumärke&quot; eller &quot;Sommar 2027&quot;.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
                {active.map((p) => (
                  <LevelCard key={p.id} href={`/mediaplan/projekt/${p.id}`} title={p.name} subtitle={p.years.length ? `Årsplaner: ${p.years.join(", ")}` : undefined} rollup={p.rollup} />
                ))}
              </div>
            )}
            {archived.length > 0 && (
              <div className="mt-10">
                <button onClick={() => setShowArchived((v) => !v)} className="text-sm text-gray-600 hover:text-gray-800 font-medium mb-4" aria-expanded={showArchived}>
                  {showArchived ? "▾" : "▸"} Arkiverade projekt ({archived.length})
                </button>
                {showArchived && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
                    {archived.map((p) => <LevelCard key={p.id} href={`/mediaplan/projekt/${p.id}`} title={p.name} rollup={p.rollup} muted />)}
                  </div>
                )}
              </div>
            )}

            <div className="mt-12 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
              <button onClick={() => setModal("edit")} className="text-gray-700 hover:text-milou-600 hover:underline">Ändra namn eller kundnummer</button>
              <button onClick={archive} className="text-gray-700 hover:text-milou-600 hover:underline">{client.archived ? "Återställ kunden" : "Arkivera kunden"}</button>
              <button onClick={remove} className="text-red-600 hover:underline">Ta bort kunden</button>
            </div>
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
          onSubmit={async (v) => {
            const p = await createProject(client.id, v.name);
            router.push(`/mediaplan/projekt/${p.id}`);
          }}
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
          onSubmit={async (v) => {
            await updateClient(client.id, { name: v.name, clientNumber: v.number });
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
