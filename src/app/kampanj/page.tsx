"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCampaignPlans,
  createCampaignPlan,
  archiveCampaignPlan,
  deleteCampaignPlan,
  duplicateCampaignPlan,
} from "@/lib/api/campaign-plans";
import type { CampaignPlan } from "@/lib/types";
import CampaignPlanCard from "@/components/kampanj-dashboard/CampaignPlanCard";
import NewCampaignPlanModal from "@/components/kampanj-dashboard/NewCampaignPlanModal";
import CampaignOverlay from "@/components/campaign-overlay/CampaignOverlay";
import TagFilterBar from "@/components/shared/TagFilterBar";

export default function KampanjDashboard() {
  const [plans, setPlans] = useState<CampaignPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaignPlans();
      setPlans(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleCreate = async (name: string, start: string, end: string) => {
    const plan = await createCampaignPlan(name, start, end);
    setPlans((prev) => [plan, ...prev]);
    setShowNewModal(false);
    setActivePlanId(plan.id);
  };

  const handleArchive = async (id: string, archived: boolean) => {
    await archiveCampaignPlan(id, archived);
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, archived } : p));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna kampanj?")) return;
    await deleteCampaignPlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDuplicate = async (id: string) => {
    const newPlan = await duplicateCampaignPlan(id);
    setPlans((prev) => [newPlan, ...prev]);
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const matchesTags = (p: CampaignPlan) =>
    activeTags.length === 0 || activeTags.every((t) => p.tags?.includes(t));

  const allTags = Array.from(new Set(plans.flatMap((p) => p.tags ?? []))).sort();

  const active = plans.filter((p) => !p.archived && matchesTags(p));
  const archived = plans.filter((p) => p.archived && matchesTags(p));

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow">
        <h1 className="text-base font-semibold">Kampanjer</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-milou-500 hover:bg-milou-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Ny kampanj
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-40 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <TagFilterBar tags={allTags} activeTags={activeTags} onToggle={toggleTag} onClear={() => setActiveTags([])} />

            {active.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-4">📣</div>
                <p className="text-lg font-medium text-gray-500">
                  {activeTags.length > 0 ? "Inga kampanjer matchar filtret" : "Inga kampanjer ännu"}
                </p>
                {activeTags.length === 0 && (
                  <p className="text-sm mt-1">Klicka på &quot;Ny kampanj&quot; för att komma igång</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map((plan) => (
                <CampaignPlanCard
                  key={plan.id}
                  plan={plan}
                  onOpen={() => setActivePlanId(plan.id)}
                  onArchive={() => handleArchive(plan.id, true)}
                  onDelete={() => handleDelete(plan.id)}
                  onDuplicate={() => handleDuplicate(plan.id)}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                    {archived.map((plan) => (
                      <CampaignPlanCard
                        key={plan.id}
                        plan={plan}
                        onOpen={() => setActivePlanId(plan.id)}
                        onArchive={() => handleArchive(plan.id, false)}
                        onDelete={() => handleDelete(plan.id)}
                        archived
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
        <NewCampaignPlanModal onClose={() => setShowNewModal(false)} onCreate={handleCreate} />
      )}

      {activePlanId && (
        <CampaignOverlay
          planId={activePlanId}
          onClose={() => { setActivePlanId(null); loadPlans(); }}
        />
      )}
    </div>
  );
}
