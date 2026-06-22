"use client";

import { useEffect, useState, useCallback } from "react";
import { getFullPlan, updatePlan, generateShareToken } from "@/lib/api/plans";
import type { FullMediaPlan } from "@/lib/types";
import GanttTimeline from "./GanttTimeline";
import { formatSwedishDateFull } from "@/lib/utils/dates";
import { calcPlanTotal, formatSEK } from "@/lib/utils/budget";

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

  const loadPlan = useCallback(async () => {
    const data = await getFullPlan(planId);
    setPlan(data);
    setLoading(false);
  }, [planId]);

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

  const handlePeriodUpdate = async (field: "period_start" | "period_end", value: string) => {
    if (!plan) return;
    await updatePlan(plan.id, { [field]: value });
    setPlan((p) => p ? { ...p, [field]: value } : p);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative flex flex-col bg-white w-full h-full overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {loading || !plan ? (
              <div className="h-5 w-48 bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                {readOnly ? (
                  <h1 className="text-base font-semibold truncate">{plan.campaign_name}</h1>
                ) : (
                  <EditableName value={plan.campaign_name} onSave={handleNameUpdate} />
                )}
                <span className="text-gray-400 text-sm shrink-0">
                  {formatSwedishDateFull(plan.period_start)} – {formatSwedishDateFull(plan.period_end)}
                </span>
                {!readOnly && (
                  <div className="flex gap-2 shrink-0">
                    <input
                      type="date"
                      value={plan.period_start}
                      onChange={(e) => handlePeriodUpdate("period_start", e.target.value)}
                      className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                      type="date"
                      value={plan.period_end}
                      onChange={(e) => handlePeriodUpdate("period_end", e.target.value)}
                      className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {plan && !readOnly && (
              <div className="text-sm text-gray-400 mr-2">
                Totalt: <span className="text-white font-semibold">{formatSEK(calcPlanTotal(plan))}</span>
              </div>
            )}

            {readOnly ? (
              <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-1 rounded-full">
                Visningsläge
              </span>
            ) : (
              <button
                onClick={handleShare}
                className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copyDone ? "✓ Länk kopierad!" : "🔗 Dela länk"}
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none transition-colors ml-1"
              title="Stäng (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {shareLink && !copyDone && (
          <div className="bg-indigo-900 text-indigo-200 text-xs px-6 py-2 flex items-center gap-2">
            <span className="font-medium">Delningslänk:</span>
            <code className="font-mono">{shareLink}</code>
            <button
              onClick={() => navigator.clipboard.writeText(shareLink)}
              className="underline hover:text-white"
            >
              Kopiera
            </button>
          </div>
        )}

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
            <GanttTimeline
              plan={plan}
              readOnly={readOnly}
              onPlanChanged={loadPlan}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EditableName({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) onSave(draft.trim());
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="text-base font-semibold bg-gray-800 text-white border border-gray-600 rounded px-2 py-0.5 min-w-48"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-base font-semibold text-white hover:text-indigo-300 truncate max-w-xs transition-colors"
      title="Klicka för att redigera namn"
    >
      {value}
    </button>
  );
}
