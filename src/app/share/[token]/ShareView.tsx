"use client";

import { useRef, useState } from "react";
import type { FullMediaPlan } from "@/lib/types";
import GanttTimeline from "@/components/plan-overlay/GanttTimeline";
import { formatSwedishDateFull } from "@/lib/utils/dates";
import { calcPlanTotal, calcPlanReach, formatSEK, formatReach } from "@/lib/utils/budget";
import MilouLogo from "@/components/MilouLogo";

export default function ShareView({ plan }: { plan: FullMediaPlan }) {
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleExportImage = async () => {
    if (!captureRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const gridEl = captureRef.current.querySelector("[style*='grid']") as HTMLElement | null;
      const tableWidth = gridEl ? gridEl.scrollWidth : captureRef.current.scrollWidth;
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: tableWidth,
        width: tableWidth,
      });
      const link = document.createElement("a");
      link.download = `${plan.campaign_name.replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-[#1C1C1C] text-white px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <MilouLogo className="h-7 w-auto text-white" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">{plan.campaign_name}</h1>
              <p className="text-sm text-gray-400">
                {formatSwedishDateFull(plan.period_start)} – {formatSwedishDateFull(plan.period_end)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 mt-2 sm:mt-0">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-gray-400">Total budget</div>
              <div className="text-sm font-bold text-white">{formatSEK(calcPlanTotal(plan))}</div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs text-gray-400">Beräknad räckvidd</div>
              <div className="text-sm font-bold text-white">{formatReach(calcPlanReach(plan))}</div>
            </div>
            <span className="text-xs bg-milou-900 text-milou-300 px-2 py-1 rounded-full shrink-0">
              Visningsläge
            </span>
            <button
              onClick={handleExportImage}
              disabled={exporting}
              className="text-xs bg-milou-500 hover:bg-milou-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {exporting ? "Exporterar…" : "Exportera bild"}
            </button>
          </div>
        </div>
      </div>

      {/* Category legend */}
      {plan.categories.length > 0 && (
        <div className="px-6 py-2 border-b border-gray-100 flex flex-wrap gap-x-5 gap-y-1">
          {plan.categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-gray-600 font-medium">{cat.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gantt capture area */}
      <div ref={captureRef} className="bg-white overflow-x-auto">
        {/* Export header — appears in PNG export */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1C]">{plan.campaign_name}</h2>
            <p className="text-xs text-[#6C6C6C]">
              {formatSwedishDateFull(plan.period_start)} – {formatSwedishDateFull(plan.period_end)}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-[#AAAAAA]">Total budget</div>
              <div className="text-sm font-bold text-[#1C1C1C]">{formatSEK(calcPlanTotal(plan))}</div>
            </div>
            <div>
              <div className="text-xs text-[#AAAAAA]">Beräknad räckvidd</div>
              <div className="text-sm font-bold text-[#1C1C1C]">{formatReach(calcPlanReach(plan))}</div>
            </div>
          </div>
        </div>
        <div className="max-w-screen-2xl mx-auto">
          <GanttTimeline plan={plan} readOnly compact onPlanChanged={() => {}} />
        </div>
      </div>

      <div className="text-center text-xs text-gray-300 py-4">
        Skapad med Mediaplaner
      </div>
    </div>
  );
}
