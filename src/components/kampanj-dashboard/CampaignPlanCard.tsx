"use client";

import type { CampaignPlan } from "@/lib/types";
import { formatSwedishDate } from "@/lib/utils/dates";
import TagChips from "@/components/shared/TagChips";
import ArrowSquare from "@/components/shared/ArrowSquare";

interface Props {
  plan: CampaignPlan;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  archived?: boolean;
}

export default function CampaignPlanCard({ plan, onOpen, onArchive, onDelete, onDuplicate, archived }: Props) {
  return (
    <div
      className="milou-plate bg-white cursor-pointer group flex flex-col"
      onClick={onOpen}
    >
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-extrabold text-plum-dark text-xl leading-tight line-clamp-2 group-hover:underline">
            {plan.name}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            {!archived && (
              <span
                className={`text-xs font-medium px-2 py-0.5 ${
                  plan.status === 'approved'
                    ? 'bg-blue-100 text-blue-700'
                    : plan.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {plan.status === 'approved' ? 'Godkänd' : plan.status === 'active' ? 'Aktiv' : 'Utkast'}
              </span>
            )}
            {archived && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5">
                Arkiverad
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-1">
          {formatSwedishDate(plan.period_start)} – {formatSwedishDate(plan.period_end)}
        </p>

        <TagChips tags={plan.tags} />

        <p className="text-xs text-gray-400 mt-3">
          Skapad {new Date(plan.created_at).toLocaleDateString("sv-SE")}
        </p>
      </div>

      <div
        className="px-5 pb-5 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onOpen} aria-label="Öppna kampanj" title="Öppna kampanj" className="group">
          <ArrowSquare />
        </button>

        <div className="flex items-center gap-3">
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              title="Duplicera"
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Duplicera
            </button>
          )}
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
