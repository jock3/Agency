"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPlans, createPlan, archivePlan, deletePlan, duplicatePlan } from "@/lib/api/plans";
import type { MediaPlan } from "@/lib/types";
import PlanCard from "@/components/dashboard/PlanCard";
import NewPlanModal from "@/components/dashboard/NewPlanModal";
import PlanOverlay from "@/components/plan-overlay/PlanOverlay";
import TagFilterBar from "@/components/shared/TagFilterBar";
import PageHeader, { PageHeaderButton } from "@/components/PageHeader";
import MediaplanTabs from "@/components/MediaplanTabs";
import { getPlanReportLinks } from "@/lib/api/plan-reports";
import ReportCompanyPicker from "@/components/dashboard/ReportCompanyPicker";

export default function Dashboard() {
  const [plans, setPlans] = useState<MediaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const router = useRouter();
  const [reports, setReports] = useState<{ links: Record<string, string>; companies: { id: string; name: string }[] } | null>(null);
  const [reportBusy, setReportBusy] = useState<string | null>(null);
  const [pickFor, setPickFor] = useState<MediaPlan | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    getPlanReportLinks().then(setReports).catch(() => setReports({ links: {}, companies: [] }));
  }, []);

  const createReport = async (plan: MediaPlan, companyId: string) => {
    setReportBusy(plan.id);
    setReportError(null);
    try {
      const res = await fetch("/api/mediaplan/rapport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, planId: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReportError(data.error === "REPORT_EXISTS" ? "Planen har redan en rapport i ett företag du inte är medlem i." : "Rapporten kunde inte skapas. Försök igen.");
        setReportBusy(null);
        return;
      }
      router.push(`/mediaplan/rapport/${data.id}`);
    } catch {
      setReportError("Rapporten kunde inte skapas. Försök igen.");
      setReportBusy(null);
    }
  };

  const handleReport = (plan: MediaPlan) => {
    const existing = reports?.links[plan.id];
    if (existing) return router.push(`/mediaplan/rapport/${existing}`);
    const companies = reports?.companies ?? [];
    if (companies.length === 0) return setReportError("Du är inte medlem i något företag än. Be en admin lägga till dig under Social media → Annonsverktyg.");
    if (companies.length === 1) return void createReport(plan, companies[0].id);
    setPickFor(plan);
  };

  const reportProps = (plan: MediaPlan) => ({
    reportReady: reports !== null,
    reportId: reports?.links[plan.id] ?? null,
    reportBusy: reportBusy === plan.id,
    onReport: () => handleReport(plan),
  });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlans();
      setPlans(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleCreate = async (name: string, start: string, end: string) => {
    const plan = await createPlan(name, start, end);
    setPlans((prev) => [plan, ...prev]);
    setShowNewModal(false);
    setActivePlanId(plan.id);
  };

  const handleArchive = async (id: string, archived: boolean) => {
    await archivePlan(id, archived);
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, archived } : p));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna mediaplan?")) return;
    await deletePlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDuplicate = async (id: string) => {
    const newPlan = await duplicatePlan(id);
    setPlans((prev) => [newPlan, ...prev]);
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const matchesTags = (p: MediaPlan) =>
    activeTags.length === 0 || activeTags.every((t) => p.tags?.includes(t));

  const allTags = Array.from(new Set(plans.flatMap((p) => p.tags ?? []))).sort();

  const active = plans.filter((p) => !p.archived && matchesTags(p));
  const archived = plans.filter((p) => p.archived && matchesTags(p));

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title="Mediaplaner"
        description="Budget, kanaler och tidsplan per kund, med en vy kunden kan öppna via länk."
        action={<PageHeaderButton onClick={() => setShowNewModal(true)}>+ Ny mediaplan</PageHeaderButton>}
      />
      <MediaplanTabs />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {reportError && (
          <p role="alert" className="mb-4 bg-white border-l-4 border-milou-500 px-4 py-3 text-sm flex justify-between gap-4">
            {reportError}
            <button onClick={() => setReportError(null)} className="text-gray-500 hover:text-gray-800" aria-label="Stäng">✕</button>
          </p>
        )}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-40 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <TagFilterBar tags={allTags} activeTags={activeTags} onToggle={toggleTag} onClear={() => setActiveTags([])} />

            {active.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-lg font-medium text-gray-500">
                  {activeTags.length > 0 ? "Inga mediaplaner matchar filtret" : "Inga mediaplaner ännu"}
                </p>
                {activeTags.length === 0 && (
                  <p className="text-sm mt-1">Klicka på &quot;Ny mediaplan&quot; för att komma igång</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
              {active.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onOpen={() => setActivePlanId(plan.id)}
                  onArchive={() => handleArchive(plan.id, true)}
                  onDelete={() => handleDelete(plan.id)}
                  onDuplicate={() => handleDuplicate(plan.id)}
                  {...reportProps(plan)}
                />
              ))}
            </div>

            {archived.length > 0 && (
              <div className="mt-10">
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 font-medium"
                >
                  <span className={`transition-transform ${showArchived ? "rotate-90" : ""}`}>▶</span>
                  Arkiverade ({archived.length})
                </button>

                {showArchived && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12 opacity-60">
                    {archived.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onOpen={() => setActivePlanId(plan.id)}
                        onArchive={() => handleArchive(plan.id, false)}
                        onDelete={() => handleDelete(plan.id)}
                        archived
                        {...reportProps(plan)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {showNewModal && (
        <NewPlanModal onClose={() => setShowNewModal(false)} onCreate={handleCreate} />
      )}

      {activePlanId && (
        <PlanOverlay
          planId={activePlanId}
          onClose={() => { setActivePlanId(null); loadPlans(); }}
        />
      )}
      {pickFor && reports && (
        <ReportCompanyPicker
          planName={pickFor.campaign_name}
          companies={reports.companies}
          onPick={(id) => { const p = pickFor; setPickFor(null); void createReport(p, id); }}
          onClose={() => setPickFor(null)}
        />
      )}
    </div>
  );
}
