"use client";

import type { CampaignPlan } from "@/lib/types";
import { formatSwedishDate } from "@/lib/utils/dates";

const PLAN_STATUS: Record<CampaignPlan["status"], { label: string; bg: string; color: string }> = {
  draft:    { label: "Utkast",    bg: "#F3F4F6", color: "#6B7280" },
  active:   { label: "Aktiv",    bg: "#ECFDF5", color: "#059669" },
  approved: { label: "Godkänd",  bg: "#EFF6FF", color: "#2563EB" },
};

interface Props {
  plan: CampaignPlan;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  archived?: boolean;
}

export default function KampanjCard({ plan, onOpen, onArchive, onDelete, archived }: Props) {
  const statusCfg = PLAN_STATUS[plan.status];

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group overflow-hidden"
      onClick={onOpen}
    >
      <div className="h-1.5 bg-gradient-to-r from-milou-600 to-milou-400" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 group-hover:text-milou-500 transition-colors">
            {plan.name}
          </h2>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
            >
              {statusCfg.label}
            </span>
            {archived && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Arkiverad
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-1.5">
          {formatSwedishDate(plan.period_start)} – {formatSwedishDate(plan.period_end)}
        </p>

        {plan.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {plan.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Skapad {new Date(plan.created_at).toLocaleDateString("sv-SE")}
        </p>
      </div>

      <div
        className="border-t border-gray-100 px-5 py-2.5 flex items-center justify-between bg-gray-50 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onOpen} className="text-xs text-milou-500 hover:text-milou-700 font-medium">
          Öppna kampanj →
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onArchive} className="text-xs text-gray-400 hover:text-gray-600">
            {archived ? "↩ Återställ" : "Arkivera"}
          </button>
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">
            Ta bort
          </button>
        </div>
      </div>
    </div>
  );
}
