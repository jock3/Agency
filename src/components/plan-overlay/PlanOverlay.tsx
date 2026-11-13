"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFullPlan, updatePlan, generateShareToken } from "@/lib/api/plans";
import type { FullMediaPlan } from "@/lib/types";
import GanttTimeline from "./GanttTimeline";
import InlineEdit from "./InlineEdit";
import { formatSwedishDateFull } from "@/lib/utils/dates";
import { calcPlanReach, calcPlanTotal, formatReach, formatSEK } from "@/lib/utils/budget";
import { Check, ImageDown, Link2 } from "lucide-react";
import { PlanHero, PlanToolbar, ShareLinkBar, ToolbarButton } from "@/components/shared/PlanShell";

interface Props {
  planId: string;
  onClose: () => void;
  readOnly?: boolean;
}

export default function PlanOverlay({ planId, onClose, readOnly }: Props) {
  const [plan, setPlan] = useState<FullMediaPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const loadPlan = useCallback(async () => {
    const data = await getFullPlan(planId);
    // Äldre kategorier utan sektion ligger kvar i databasen men visas inte i redigeraren.
    // Koncept och deadlines i toppen av planen visas inte i redigeraren längre; de ligger kvar i databasen.
    setPlan(data && !readOnly ? { ...data, categories: data.categories.filter((c) => c.section), concepts: [], deadlines: [] } : data);
    setLoading(false);
  }, [planId, readOnly]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleShare = async () => {
    if (!plan) return;
    const token = await generateShareToken(plan.id);
    const url = `${window.location.origin}/share/${token}`;
    setShareLink(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const handleNameUpdate = async (name: string) => {
    if (!plan) return;
    await updatePlan(plan.id, { campaign_name: name });
    setPlan((p) => p ? { ...p, campaign_name: name } : p);
  };

  const handleExportImage = async () => {
    if (!captureRef.current || !plan) return;
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

  const handleClientIdUpdate = async (value: string) => {
    if (!plan) return;
    const trimmed = value.trim() || null;
    await updatePlan(plan.id, { client_id: trimmed });
    setPlan((p) => p ? { ...p, client_id: trimmed } : p);
  };

  const handlePeriodUpdate = async (field: "period_start" | "period_end", value: string) => {
    if (!plan) return;
    await updatePlan(plan.id, { [field]: value });
    setPlan((p) => p ? { ...p, [field]: value } : p);
  };

  const handlePlannedBudgetUpdate = async (v: string) => {
    if (!plan) return;
    const planned_budget = v.trim() ? Number(v) : null;
    await updatePlan(plan.id, { planned_budget });
    setPlan((p) => p ? { ...p, planned_budget } : p);
  };

  const handleTagsUpdate = async (tags: string[]) => {
    if (!plan) return;
    await updatePlan(plan.id, { tags });
    setPlan((p) => p ? { ...p, tags } : p);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative flex flex-col bg-white w-full h-full overflow-hidden">
        <PlanToolbar
          kind="mediaplaner"
          readOnly={readOnly}
          periodStart={plan?.period_start}
          periodEnd={plan?.period_end}
          onPeriod={handlePeriodUpdate}
          clientId={plan?.client_id}
          onClientId={handleClientIdUpdate}
          tags={plan?.tags ?? []}
          onTags={handleTagsUpdate}
          onClose={onClose}
          actions={
            plan && !readOnly && (
              <>
                <ToolbarButton onClick={handleExportImage} disabled={exporting}>
                  <ImageDown className="w-4 h-4" />
                  {exporting ? "Exporterar…" : "Exportera bild"}
                </ToolbarButton>
                <ToolbarButton onClick={handleShare} primary>
                  {copyDone ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  {copyDone ? "Länken är kopierad" : "Kopiera kundlänk"}
                </ToolbarButton>
              </>
            )
          }
        />

        {shareLink && !copyDone && <ShareLinkBar link={shareLink} />}

        {/* Plan content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 animate-pulse">Laddar mediaplan…</div>
            </div>
          ) : !plan ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              Kunde inte ladda planen
            </div>
          ) : (
            <div ref={captureRef}>
              {/* Rubrikytan kommer med i PNG-exporten. */}
              <PlanHero
                name={plan.campaign_name}
                onName={readOnly ? undefined : handleNameUpdate}
                period={`${formatSwedishDateFull(plan.period_start)} – ${formatSwedishDateFull(plan.period_end)}`}
                stats={(() => {
                  const booked = calcPlanTotal(plan);
                  const left = plan.planned_budget != null ? plan.planned_budget - booked : null;
                  return [
                    { label: "Bokat", value: formatSEK(booked) },
                    {
                      label: "Planerad budget",
                      value: readOnly ? (plan.planned_budget != null ? formatSEK(plan.planned_budget) : "–") : (
                        <InlineEdit
                          value={plan.planned_budget != null ? String(plan.planned_budget) : ""}
                          onSave={handlePlannedBudgetUpdate}
                          type="number"
                          suffix="kr"
                          placeholder="Ange"
                        />
                      ),
                    },
                    ...(left != null
                      ? [left >= 0
                        ? { label: "Kvar av budget", value: formatSEK(left) }
                        : { label: "Över budget", value: formatSEK(-left), alert: true }]
                      : []),
                    { label: "Räckvidd", value: formatReach(calcPlanReach(plan)) },
                  ];
                })()}
              />
              <GanttTimeline
                plan={plan}
                readOnly={readOnly}
                onPlanChanged={loadPlan}
                onPlanLocal={(update) => setPlan((p) => (p ? update(p) : p))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
