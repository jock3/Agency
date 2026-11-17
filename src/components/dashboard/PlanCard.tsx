"use client";

import type { MediaPlan } from "@/lib/types";
import { formatSwedishDate } from "@/lib/utils/dates";
import TagChips from "@/components/shared/TagChips";

interface Props {
  plan: MediaPlan;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  archived?: boolean;
  /** Id på planens rapport, om den har en. Då heter knappen "Se rapport". */
  reportId?: string | null;
  /** Visas först när länkarna är hämtade, så knappen inte byter text. */
  reportReady?: boolean;
  onReport?: () => void;
  reportBusy?: boolean;
}

export default function PlanCard({ plan, onOpen, onArchive, onDelete, onDuplicate, archived, reportId, reportReady, onReport, reportBusy }: Props) {
  return (
    <div className="milou-plate bg-white flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-extrabold text-plum-dark text-xl leading-tight line-clamp-2">
            <button
              type="button"
              onClick={onOpen}
              title="Öppna plan"
              className="text-left hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500"
            >
              {plan.campaign_name}
            </button>
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

      <div className="px-5 pb-5 flex flex-col gap-3">
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            disabled={!reportReady || reportBusy}
            className="w-full h-11 bg-milou-500 hover:bg-milou-600 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {!reportReady ? "Rapport" : reportBusy ? "Skapar…" : reportId ? "Se rapport" : "Skapa rapport"}
          </button>
        )}

        <div className="flex items-center justify-end gap-3">
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
