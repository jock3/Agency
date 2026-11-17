"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFullPlan, updatePlan, generateShareToken } from "@/lib/api/plans";
import { getPlanContext } from "@/lib/api/hierarchy";
import type { FullMediaPlan } from "@/lib/types";
import GanttTimeline from "./GanttTimeline";
import PlanHeader, { PlanSettings, type PlanContext } from "./PlanHeader";
import { getPlanWeeks } from "@/lib/utils/dates";
import { todayIso } from "@/lib/mediaplan/schedule";
import { ShareLinkBar } from "@/components/shared/PlanShell";

interface Props {
  planId: string;
  onClose: () => void;
  readOnly?: boolean;
}

/**
 * Kampanjens mediaplan i ett fönster ovanpå sidan: rubrik med nyckeltal, inställningar
 * och tabellen med kanaler och veckor. Allt går att ändra direkt.
 */
export default function PlanOverlay({ planId, onClose, readOnly }: Props) {
  const [plan, setPlan] = useState<FullMediaPlan | null>(null);
  const [ctx, setCtx] = useState<PlanContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(() => todayIso());
  const captureRef = useRef<HTMLDivElement>(null);

  const loadPlan = useCallback(async () => {
    const data = await getFullPlan(planId);
    // Äldre kategorier utan sektion ligger kvar i databasen men visas inte i redigeraren.
    // Koncept och deadlines i toppen av planen visas inte i redigeraren längre; de ligger kvar i databasen.
    setPlan(data && !readOnly ? { ...data, categories: data.categories.filter((c) => c.section), concepts: [], deadlines: [] } : data);
    setLoading(false);
  }, [planId, readOnly]);

  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => { getPlanContext(planId).then(setCtx).catch(() => setCtx(null)); }, [planId]);

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

  // Sparar i bakgrunden; visar ett felmeddelande och hämtar om planen om det misslyckas.
  const save = async (updates: Partial<FullMediaPlan>) => {
    if (!plan) return;
    setPlan((p) => (p ? { ...p, ...updates } : p));
    try {
      await updatePlan(plan.id, updates);
      setError(null);
    } catch {
      setError("Ändringen kunde inte sparas. Försök igen.");
      loadPlan();
    }
  };

  const handleShare = async () => {
    if (!plan) return;
    try {
      const token = await generateShareToken(plan.id);
      const url = `${window.location.origin}/share/${token}`;
      setShareLink(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setError("Kundlänken kunde inte skapas. Försök igen.");
    }
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
    } catch {
      setError("Bilden kunde inte skapas. Försök igen.");
    } finally {
      setExporting(false);
    }
  };

  const weekCount = plan ? getPlanWeeks(plan.period_start, plan.period_end).length : 0;
  const weekSpan = plan ? (() => { const w = getPlanWeeks(plan.period_start, plan.period_end); return w.length ? `v.${w[0].no}${w.length > 1 ? `–${w[w.length - 1].no}` : ""} · ${w.length} ${w.length === 1 ? "vecka" : "veckor"}` : ""; })() : "";

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div className="absolute inset-0" onClick={onClose} />

      <div role="dialog" aria-modal="true" aria-label={plan ? `Mediaplan ${plan.campaign_name}` : "Mediaplan"} className="mp relative flex flex-col bg-gray-50 text-gray-900 w-full h-full overflow-hidden">
        {shareLink && !copyDone && <ShareLinkBar link={shareLink} />}
        {error && (
          <p role="alert" className="m-0 px-6 py-2.5 bg-[#E60330] text-white text-sm font-semibold flex justify-between gap-4">
            {error}
            <button type="button" onClick={() => setError(null)} aria-label="Stäng meddelandet" className="font-bold">✕</button>
          </p>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-600 animate-pulse">Laddar mediaplan…</div>
          ) : !plan ? (
            <div role="alert" className="flex flex-col items-center justify-center gap-4 h-64 text-[#C8022A] font-semibold">
              Kunde inte ladda planen
              <button type="button" onClick={onClose} className="min-h-11 px-4 border border-gray-900 text-gray-900 text-sm font-bold hover:bg-gray-900 hover:text-white">Stäng</button>
            </div>
          ) : (
            <div ref={captureRef} className="bg-gray-50">
              <PlanHeader
                plan={plan}
                ctx={ctx}
                today={today}
                readOnly={readOnly}
                exporting={exporting}
                copyDone={copyDone}
                onName={(campaign_name) => save({ campaign_name })}
                onBudget={(planned_budget) => save({ planned_budget })}
                onExport={handleExportImage}
                onShare={handleShare}
                onClose={onClose}
              />
              {!readOnly && (
                <div className="max-w-[1280px] mx-auto px-5 min-[761px]:px-10 pt-8">
                  <PlanSettings
                    plan={plan}
                    backLabel={ctx ? `Alla kampanjer i ${ctx.project.name}` : "Alla planer"}
                    onClose={onClose}
                    onPeriod={(field, value) => save({ [field]: value })}
                    onClientId={(value) => { const v = value.trim() || null; if (v !== (plan.client_id ?? null)) save({ client_id: v }); }}
                    onStatus={(status) => save({ status })}
                    onTags={(tags) => save({ tags })}
                  />
                </div>
              )}
              {/* Kalendern får hela fönstrets bredd; rubrik och inställningar ovanför behåller sin spalt. */}
              <section aria-labelledby="planen" className="px-5 min-[761px]:px-10 pt-10 pb-[72px]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="planen" className="m-0 text-[30px] font-extrabold tracking-[-0.01em]">Kanaler och veckor</h2>
                    {!readOnly && <p className="mt-1.5 mb-0 text-[15px] text-gray-600">Ändra à-pris och antal så räknas kostnaden, bokat och kvar av budget ut direkt. Dra i ett block för att ändra veckorna.</p>}
                  </div>
                  {weekCount > 0 && <p className="m-0 text-sm font-bold">{weekSpan}</p>}
                </div>
                <div className="-mx-4">
                  <GanttTimeline
                    plan={plan}
                    readOnly={readOnly}
                    onPlanChanged={loadPlan}
                    onPlanLocal={(update) => setPlan((p) => (p ? update(p) : p))}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
