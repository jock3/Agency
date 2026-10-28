"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFullCampaignPlan, updateCampaignPlan } from "@/lib/api/campaign-plans";
import type { FullCampaignPlan } from "@/lib/types";
import CampaignTimeline from "./CampaignTimeline";
import { formatSwedishDateFull } from "@/lib/utils/dates";
import { calcCampaignPlanTotal, formatSEK } from "@/lib/utils/campaign-budget";
import { Check, Link2 } from "lucide-react";
import { PlanHero, PlanToolbar, ShareLinkBar, ToolbarButton } from "@/components/shared/PlanShell";

const STATUS_LABEL: Record<string, string> = { draft: "Utkast", active: "Aktiv", approved: "Godkänd" };

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
        <PlanToolbar
          kind="kampanjer"
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
              <ToolbarButton onClick={handleShare} primary>
                {copyDone ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {copyDone ? "Länken är kopierad" : "Kopiera kundlänk"}
              </ToolbarButton>
            )
          }
        />

        {shareLink && !copyDone && <ShareLinkBar link={shareLink} />}

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
              <PlanHero
                name={plan.name}
                onName={readOnly ? undefined : handleNameUpdate}
                period={`${formatSwedishDateFull(plan.period_start)} – ${formatSwedishDateFull(plan.period_end)}`}
                stats={[
                  { label: "Budget", value: formatSEK(calcCampaignPlanTotal(plan)) },
                  { label: "Kampanjer", value: String(plan.campaigns.length) },
                  { label: "Plattformar", value: String(plan.campaigns.reduce((n, c) => n + c.platforms.length, 0)) },
                  { label: "Status", value: STATUS_LABEL[plan.status] ?? plan.status },
                ]}
              />
              <CampaignTimeline plan={plan} readOnly={readOnly} onPlanChanged={loadPlan} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
