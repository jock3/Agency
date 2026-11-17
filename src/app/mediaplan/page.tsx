"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader, { PageHeaderButton } from "@/components/PageHeader";
import MediaplanTabs from "@/components/MediaplanTabs";
import Steps from "@/components/mediaplan/Steps";
import LevelCard from "@/components/mediaplan/LevelCard";
import FormModal from "@/components/mediaplan/FormModal";
import { createClient, listClients, type ClientSummary } from "@/lib/api/hierarchy";

/** Steg 1: välj kund. */
export default function ClientsStep() {
  const router = useRouter();
  const [data, setData] = useState<{ clients: ClientSummary[]; unsorted: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(() => {
    listClients().then(setData).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const q = query.trim().toLowerCase();
  const match = (c: ClientSummary) => !q || c.name.toLowerCase().includes(q) || c.client_number.toLowerCase().includes(q);
  const active = (data?.clients ?? []).filter((c) => !c.archived && match(c));
  const archived = (data?.clients ?? []).filter((c) => c.archived && match(c));

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title="Mediaplaner"
        description="Välj kund, sedan projekt. I projektet ligger årets mediaplan och projektets kampanjer."
        action={<PageHeaderButton onClick={() => setCreating(true)}>+ Ny kund</PageHeaderButton>}
      />
      <MediaplanTabs />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Steps current={1} />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök kund eller kundnummer"
            aria-label="Sök kund"
            className="w-full sm:w-80 border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500"
          />
          <div className="flex gap-4 text-sm">
            {data && data.unsorted > 0 && (
              <Link href="/mediaplan/osorterade" className="text-milou-600 font-semibold hover:underline">Osorterade planer ({data.unsorted})</Link>
            )}
            <Link href="/mediaplan/alla" className="text-gray-600 hover:text-milou-600 hover:underline">Alla planer i en lista</Link>
          </div>
        </div>

        {failed && <p role="alert" className="bg-white px-5 py-4 text-milou-600">Kunderna kunde inte hämtas. Ladda om sidan.</p>}
        {!data && !failed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {[0, 1, 2].map((i) => <div key={i} className="bg-white h-36 animate-pulse" />)}
          </div>
        )}
        {data && active.length === 0 && (
          <div className="bg-white px-6 py-10 text-center text-gray-600">
            {q ? "Ingen kund matchar sökningen." : "Inga kunder än. Klicka på \"+ Ny kund\" för att börja."}
          </div>
        )}
        {data && active.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {active.map((c) => (
              <LevelCard
                key={c.id}
                href={`/mediaplan/kund/${c.id}`}
                title={c.name}
                subtitle={c.client_number || undefined}
                facts={[`${c.projects} ${c.projects === 1 ? "projekt" : "projekt"}`]}
                rollup={c.rollup}
              />
            ))}
          </div>
        )}
        {archived.length > 0 && (
          <div className="mt-10">
            <button onClick={() => setShowArchived((v) => !v)} className="text-sm text-gray-600 hover:text-gray-800 font-medium mb-4" aria-expanded={showArchived}>
              {showArchived ? "▾" : "▸"} Arkiverade kunder ({archived.length})
            </button>
            {showArchived && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
                {archived.map((c) => <LevelCard key={c.id} href={`/mediaplan/kund/${c.id}`} title={c.name} subtitle={c.client_number || undefined} rollup={c.rollup} muted />)}
              </div>
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
          onSubmit={async (v) => {
            const c = await createClient({ name: v.name, clientNumber: v.number });
            router.push(`/mediaplan/kund/${c.id}`);
          }}
        />
      )}
    </div>
  );
}
