"use client";

import type { FullCampaignPlan } from "@/lib/types";
import CampaignTimeline from "@/components/campaign-overlay/CampaignTimeline";
import { formatSwedishDateFull } from "@/lib/utils/dates";
import { calcCampaignPlanTotal, formatSEK } from "@/lib/utils/campaign-budget";
import MilouLogo from "@/components/MilouLogo";

export default function CampaignShareView({ plan }: { plan: FullCampaignPlan }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="bg-[#1C1C1C] text-white px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <MilouLogo className="h-7 w-auto text-white" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">{plan.name}</h1>
              <p className="text-sm text-gray-400">
                {formatSwedishDateFull(plan.period_start)} – {formatSwedishDateFull(plan.period_end)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 mt-2 sm:mt-0">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-gray-400">Total budget</div>
              <div className="text-sm font-bold text-white">{formatSEK(calcCampaignPlanTotal(plan))}</div>
            </div>
            <span className="text-xs bg-milou-900 text-milou-300 px-2 py-1 rounded-full shrink-0">
              Visningsläge
            </span>
          </div>
        </div>
      </div>

      {plan.campaigns.length > 0 && (
        <div className="px-6 py-2 border-b border-gray-100 flex flex-wrap gap-x-5 gap-y-1">
          {plan.campaigns.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-gray-600 font-medium">{c.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white overflow-x-auto">
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1C]">{plan.name}</h2>
            <p className="text-xs text-[#6C6C6C]">
              {formatSwedishDateFull(plan.period_start)} – {formatSwedishDateFull(plan.period_end)}
            </p>
          </div>
          <div>
            <div className="text-xs text-[#AAAAAA]">Total budget</div>
            <div className="text-sm font-bold text-[#1C1C1C]">{formatSEK(calcCampaignPlanTotal(plan))}</div>
          </div>
        </div>
        <div className="max-w-screen-2xl mx-auto">
          <CampaignTimeline plan={plan} readOnly compact onPlanChanged={() => {}} />
        </div>
      </div>

      <div className="text-center text-xs text-gray-300 py-4">
        Skapad med Kampanjer
      </div>
    </div>
  );
}
