"use client";

import { useEffect, useId, useState } from "react";
import { getClient, listClients, movePlan, type ClientSummary, type ProjectSummary } from "@/lib/api/hierarchy";
import type { MediaPlan } from "@/lib/types";

const field = "w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-milou-500";

/** Flyttar en plan till ett projekt, som årsplan eller kampanj. Kund- och projekttaggar läggs till. */
export default function MovePlanDialog({ plan, onClose, onMoved }: { plan: MediaPlan; onClose: () => void; onMoved: () => void }) {
  const titleId = useId();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [clientId, setClientId] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [projectId, setProjectId] = useState("");
  const [kind, setKind] = useState<"campaign" | "year">("campaign");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listClients().then((d) => setClients(d.clients.filter((c) => !c.archived))).catch(() => setClients([])); }, []);
  useEffect(() => {
    setProjects(null);
    setProjectId("");
    if (clientId) getClient(clientId).then((d) => setProjects(d?.projects.filter((p) => !p.archived) ?? [])).catch(() => setProjects([]));
  }, [clientId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const year = plan.period_start.slice(0, 4);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return setError("Välj kund och projekt.");
    setSaving(true);
    setError(null);
    try {
      await movePlan(plan.id, projectId, kind);
      onMoved();
    } catch (err) {
      setError(err instanceof Error && err.message === "DUPLICATE" ? `Projektet har redan en årsplan för ${year}. Flytta planen som kampanj i stället.` : "Planen kunde inte flyttas. Försök igen.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center p-4" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit} className="bg-white w-full max-w-md p-5 shadow-2xl">
        <h2 id={titleId} className="font-bold text-lg">Flytta {plan.campaign_name}</h2>
        <p className="text-sm text-gray-600 mt-1">Planen får kundens och projektets namn som taggar. Inget annat i planen ändras.</p>
        <div className="flex flex-col gap-3 mt-4">
          <label className="block text-sm">
            <span className="block text-gray-700 font-medium mb-1">Kund</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field} disabled={!clients}>
              <option value="">{clients ? "Välj kund" : "Hämtar…"}</option>
              {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.client_number ? ` (${c.client_number})` : ""}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 font-medium mb-1">Projekt</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field} disabled={!clientId || !projects}>
              <option value="">{!clientId ? "Välj kund först" : projects ? (projects.length ? "Välj projekt" : "Kunden har inga projekt än") : "Hämtar…"}</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <fieldset className="text-sm">
            <legend className="text-gray-700 font-medium mb-1">Planen är</legend>
            <label className="flex items-center gap-2"><input type="radio" checked={kind === "campaign"} onChange={() => setKind("campaign")} /> En kampanj</label>
            <label className="flex items-center gap-2"><input type="radio" checked={kind === "year"} onChange={() => setKind("year")} /> Projektets årsplan för {year}</label>
          </fieldset>
        </div>
        {error && <p role="alert" className="text-sm text-milou-600 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} disabled={saving} className="h-9 px-3.5 border border-gray-300 bg-white text-sm hover:bg-gray-50">Avbryt</button>
          <button type="submit" disabled={saving || !projectId} className="h-9 px-3.5 bg-milou-500 hover:bg-milou-600 disabled:opacity-60 text-white text-sm font-bold">{saving ? "Flyttar…" : "Flytta"}</button>
        </div>
      </form>
    </div>
  );
}
