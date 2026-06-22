"use client";

import type { MediaPlan } from "@/lib/types";
import { formatSwedishDate } from "@/lib/utils/dates";

interface Props {
  plan: MediaPlan;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  archived?: boolean;
}

export default function PlanCard({ plan, onOpen, onArchive, onDelete, archived }: Props) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group overflow-hidden"
      onClick={onOpen}
    >
      {/* Color accent strip */}
      <div className="h-1.5 bg-gradient-to-r from-milou-500 to-milou-700" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 group-hover:text-milou-500 transition-colors">
            {plan.campaign_name}
          </h2>
          {archived && (
            <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              Arkiverad
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-1">
          {formatSwedishDate(plan.period_start)} – {formatSwedishDate(plan.period_end)}
        </p>

        <p className="text-xs text-gray-400 mt-3">
          Skapad {new Date(plan.created_at).toLocaleDateString("sv-SE")}
        </p>
      </div>

      <div
        className="border-t border-gray-100 px-5 py-2.5 flex items-center justify-between bg-gray-50 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onOpen}
          className="text-xs text-milou-500 hover:text-milou-700 font-medium"
        >
          Öppna plan →
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onArchive}
            title={archived ? "Återställ" : "Arkivera"}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {archived ? "↩ Återställ" : "Arkivera"}
          </button>
          <button
            onClick={onDelete}
            title="Ta bort"
            className="text-xs text-red-400 hover:text-red-600"
          >
            Ta bort
          </button>
        </div>
      </div>
    </div>
  );
}
