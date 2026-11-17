"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import MediaplanTabs from "@/components/MediaplanTabs";
import MediaplanCrumbs from "@/components/mediaplan/MediaplanCrumbs";
import PlanCard from "@/components/dashboard/PlanCard";
import PlanOverlay from "@/components/plan-overlay/PlanOverlay";
import { usePlanReports } from "@/components/dashboard/usePlanReports";
import MovePlanDialog from "@/components/mediaplan/MovePlanDialog";
import { listUnsortedPlans } from "@/lib/api/hierarchy";
import { archivePlan, deletePlan } from "@/lib/api/plans";
import type { MediaPlan } from "@/lib/types";

/** Planer som inte ligger i något projekt, med knapp för att flytta dem. */
export default function UnsortedPlans() {
  const [plans, setPlans] = useState<MediaPlan[] | null>(null);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const [moving, setMoving] = useState<MediaPlan | null>(null);
  const { reportProps, reportUi } = usePlanReports();

  const load = useCallback(() => { listUnsortedPlans().then(setPlans).catch(() => setPlans([])); }, []);
  useEffect(load, [load]);

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Osorterade planer" description="Planer som inte ligger under någon kund och något projekt. Flytta dem dit de hör hemma." />
      <MediaplanTabs />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <MediaplanCrumbs items={[{ label: "Osorterade" }]} />
        {reportUi}
        {!plans && <div className="bg-white h-40 animate-pulse" />}
        {plans && plans.length === 0 && <p className="bg-white px-6 py-10 text-center text-gray-600">Alla planer ligger i ett projekt.</p>}
        {plans && plans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {plans.map((p) => (
              <div key={p.id} className={`flex flex-col gap-2 ${p.archived ? "opacity-60" : ""}`}>
                <PlanCard
                  plan={p}
                  archived={p.archived}
                  onOpen={() => setOpenPlan(p.id)}
                  onArchive={async () => { await archivePlan(p.id, !p.archived); load(); }}
                  onDelete={async () => { if (confirm(`Ta bort ${p.campaign_name}? Det går inte att ångra.`)) { await deletePlan(p.id); load(); } }}
                  {...reportProps(p)}
                />
                <button onClick={() => setMoving(p)} className="h-10 border-2 border-gray-900 bg-white text-sm font-bold hover:bg-gray-900 hover:text-white">
                  Flytta till kund och projekt…
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      {openPlan && <PlanOverlay planId={openPlan} onClose={() => { setOpenPlan(null); load(); }} />}
      {moving && <MovePlanDialog plan={moving} onClose={() => setMoving(null)} onMoved={() => { setMoving(null); load(); }} />}
    </div>
  );
}
