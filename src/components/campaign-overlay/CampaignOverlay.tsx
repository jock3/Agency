"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFullCampaignPlan, updateCampaignPlan } from "@/lib/api/campaign-plans";
import type { FullCampaignPlan } from "@/lib/types";
import CampaignTimeline from "./CampaignTimeline";
import { formatSwedishDateFull } from "@/lib/utils/dates";
import { calcCampaignPlanTotal, formatSEK } from "@/lib/utils/campaign-budget";
import TagEditor from "@/components/shared/TagEditor";

interface Props {
  planId: string;
  onClose: () => void;
  readOnly?: boolean;
}

export default function CampaignOverlay({ planId, onClose, readOnly }: Props) {
  const [plan, setPlan] = useState<FullCampaignPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const loadPlan = useCallback(async () => {
    const data = await getFullCampaignPlan(planId);
    setPlan(data);
    setLoading(false);
  }, [planId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleShare = async () => {
    if (!plan) return;
    const url = `${window.location.origin}/share/kampanj/${plan.share_token}`;
    setShareLink(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const handleNameUpdate = async (name: string) => {
    if (!plan) return;
    await updateCampaignPlan(plan.id, { name });
    setPlan((p) => p ? { ...p, name } : p);
  };

  const handleClientIdUpdate = async (value: string) => {
    if (!plan) return;
    const trimmed = value.trim() || null;
    await updateCampaignPlan(plan.id, { client_id: trimmed });
    setPlan((p) => p ? { ...p, client_id: trimmed } : p);
  };

  const handlePeriodUpdate = async (field: "period_start" | "period_end", value: string) => {
    if (!plan) return;
    await updateCampaignPlan(plan.id, { [field]: value });
    setPlan((p) => p ? { ...p, [field]: value } : p);
  };

  const handleTagsUpdate = async (tags: string[]) => {
    if (!plan) return;
    await updateCampaignPlan(plan.id, { tags });
    setPlan((p) => p ? { ...p, tags } : p);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex flex-col bg-white w-full h-full overflow-hidden">
        <div className="bg-[#1C1C1C] text-white px-6 py-3 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {loading || !plan ? (
              <div className="h-5 w-48 bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                {readOnly ? (
                  <h1 className="text-base font-semibold truncate">{plan.name}</h1>
                ) : (
                  <EditableName value={plan.name} onSave={handleNameUpdate} />
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
                      className="text-xs bg-[#2B2B2B] text-gray-300 border border-[#3a3a3a] rounded px-2 py-1"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                      type="date"
                      value={plan.period_end}
                      onChange={(e) => handlePeriodUpdate("period_end", e.target.value)}
                      className="text-xs bg-[#2B2B2B] text-gray-300 border border-[#3a3a3a] rounded px-2 py-1"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {plan && !readOnly && (
              <div className="text-sm text-gray-400 mr-2">
                Totalt: <span className="text-white font-semibold">{formatSEK(calcCampaignPlanTotal(plan))}</span>
              </div>
            )}

            {readOnly ? (
              <span className="text-xs bg-milou-900 text-milou-300 px-2 py-1 rounded-full">
                Visningsläge
              </span>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Kund-ID:</span>
                  <input
                    type="text"
                    defaultValue={plan?.client_id ?? ""}
                    onBlur={(e) => plan && handleClientIdUpdate(e.target.value)}
                    placeholder="G-001"
                    className="text-xs bg-[#2B2B2B] text-gray-200 border border-[#3a3a3a] rounded px-2 py-1 w-20 focus:outline-none focus:border-milou-500"
                  />
                </div>
                {plan && <TagEditor tags={plan.tags ?? []} onChange={handleTagsUpdate} />}
                <button
                  onClick={handleShare}
                  className="text-sm bg-[#2B2B2B] hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copyDone ? "✓ Länk kopierad!" : "🔗 Dela länk"}
                </button>
              </>
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
          <div className="bg-milou-900 text-milou-200 text-xs px-6 py-2 flex items-center gap-2">
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 animate-pulse">Laddar kampanj…</div>
            </div>
          ) : !plan ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              Kunde inte ladda kampanjen
            </div>
          ) : (
            <div ref={captureRef}>
              <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-base font-bold text-[#1C1C1C]">{plan.name}</h2>
                  <p className="text-xs text-[#6C6C6C]">
                    {formatSwedishDateFull(plan.period_start)} – {formatSwedishDateFull(plan.period_end)}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-xs text-[#AAAAAA]">Total budget</div>
                    <div className="text-sm font-bold text-[#1C1C1C]">{formatSEK(calcCampaignPlanTotal(plan))}</div>
                  </div>
                </div>
              </div>
              <CampaignTimeline plan={plan} readOnly={readOnly} onPlanChanged={loadPlan} />
            </div>
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
        className="text-base font-semibold bg-[#2B2B2B] text-white border border-gray-600 rounded px-2 py-0.5 min-w-48"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-base font-semibold text-white hover:text-milou-300 truncate max-w-xs transition-colors"
      title="Klicka för att redigera namn"
    >
      {value}
    </button>
  );
}
