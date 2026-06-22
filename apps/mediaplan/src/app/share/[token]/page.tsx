"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getFullPlanByToken } from "@/lib/api/plans";
import type { FullMediaPlan } from "@/lib/types";
import GanttTimeline from "@/components/plan-overlay/GanttTimeline";
import { formatSwedishDateFull } from "@/lib/utils/dates";
import { calcPlanTotal, calcPlanReach, formatSEK, formatReach } from "@/lib/utils/budget";

export default function SharePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [plan, setPlan] = useState<FullMediaPlan | null | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    getFullPlanByToken(token).then(setPlan);
  }, [token]);

  if (plan === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="animate-pulse">Laddar mediaplan…</div>
      </div>
    );
  }

  if (plan === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-700">Länken är inte giltig</h1>
          <p className="text-gray-400 text-sm mt-1">Mediaplanen kanske inte längre är delad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center font-bold text-sm shrink-0">M</div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">{plan.campaign_name}</h1>
              <p className="text-sm text-gray-400">
                {formatSwedishDateFull(plan.period_start)} – {formatSwedishDateFull(plan.period_end)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-xs text-gray-400">Total budget</div>
              <div className="text-sm font-bold text-white">{formatSEK(calcPlanTotal(plan))}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Beräknad räckvidd</div>
              <div className="text-sm font-bold text-white">{formatReach(calcPlanReach(plan))}</div>
            </div>
            <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-1 rounded-full shrink-0">
              Visningsläge
            </span>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="flex-1 overflow-x-auto">
        <div className="max-w-screen-2xl mx-auto">
          <GanttTimeline
            plan={plan}
            readOnly
            compact
            onPlanChanged={() => {}}
          />
        </div>
      </div>

      <div className="text-center text-xs text-gray-300 py-4">
        Skapad med Mediaplaner
      </div>
    </div>
  );
}
