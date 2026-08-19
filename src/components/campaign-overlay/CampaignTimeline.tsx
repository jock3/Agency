"use client";

import { useMemo } from "react";
import type { FullCampaignPlan, Campaign, CampaignPlatform, CampaignPlatformStatus } from "@/lib/types";
import { getPlanWeeks, getMonthGroups, dateRangeToGridSpan, WeekColumn } from "@/lib/utils/dates";
import { calcCampaignTotal, calcCampaignPlanTotal, formatSEK, PLATFORM_STATUS_LABELS, PLATFORM_STATUS_COLORS } from "@/lib/utils/campaign-budget";
import { updateCampaign, deleteCampaign, createCampaign } from "@/lib/api/campaigns";
import { updateCampaignPlatform, deleteCampaignPlatform, createCampaignPlatform } from "@/lib/api/campaign-platforms";
import InlineEdit from "@/components/plan-overlay/InlineEdit";
import ColorDot from "@/components/plan-overlay/ColorDot";

const INFO_COLS = "200px 110px 90px";
const INFO_COL_COUNT = 3;

interface Props {
  plan: FullCampaignPlan;
  readOnly?: boolean;
  compact?: boolean;
  onPlanChanged: () => void;
}

export default function CampaignTimeline({ plan, readOnly, compact, onPlanChanged }: Props) {
  const weeks = useMemo(() => getPlanWeeks(plan.period_start, plan.period_end), [plan.period_start, plan.period_end]);
  const months = useMemo(() => getMonthGroups(weeks), [weeks]);
  const weekCount = weeks.length;

  const gridCols = `${INFO_COLS} repeat(${weekCount}, minmax(20px, 1fr))`;
  const cellClass = "border-r border-b border-gray-100 px-1 py-2.5 text-xs flex items-center";
  const stickyClass = "sticky left-0 z-10 bg-white";

  const getSpan = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    return dateRangeToGridSpan(startDate, endDate, weeks);
  };

  const handleAddCampaign = async () => {
    await createCampaign(plan.id, "Ny kampanj", plan.campaigns.length);
    onPlanChanged();
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Ta bort kampanjen och alla dess plattformar?")) return;
    await deleteCampaign(id);
    onPlanChanged();
  };

  return (
    <div className="overflow-x-auto scrollbar-thin px-4 py-2 hidden md:block">
      <div
        style={{ display: "grid", gridTemplateColumns: gridCols }}
        className="min-w-max border-l border-t border-gray-100"
      >
        <div
          className={`${cellClass} sticky left-0 z-10 bg-white text-[#1C1C1C] font-bold text-lg`}
          style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
        >
          {plan.name}
        </div>
        {months.map((m) => (
          <div
            key={m.label}
            className={`${cellClass} bg-[#1C1C1C] text-white font-semibold justify-center`}
            style={{ gridColumn: `span ${m.spanCols}` }}
          >
            {m.label}
          </div>
        ))}

        {(compact ? ["Plattform", "Status"] : ["Plattform", "Status", "Budget"]).map((h) => (
          <div
            key={h}
            className={`${cellClass} ${stickyClass} bg-white text-[#E60330] text-sm font-bold border-b-2 border-[#E60330]`}
          >
            {h}
          </div>
        ))}
        {weeks.map((w) => (
          <div key={w.index} className={`${cellClass} bg-[#F2F2F2] text-[#6C6C6C] justify-center`}>
            {w.label}
          </div>
        ))}

        {plan.campaigns.map((campaign) => (
          <CampaignSection
            key={campaign.id}
            campaign={campaign}
            weeks={weeks}
            weekCount={weekCount}
            readOnly={readOnly}
            compact={compact}
            getSpan={getSpan}
            onCampaignUpdate={(updates) => updateCampaign(campaign.id, updates).then(onPlanChanged)}
            onDeleteCampaign={() => handleDeleteCampaign(campaign.id)}
            onPlanChanged={onPlanChanged}
            cellClass={cellClass}
            stickyClass={stickyClass}
          />
        ))}

        {!readOnly && (
          <>
            <div
              className={`${cellClass} ${stickyClass} bg-gray-50`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              <button onClick={handleAddCampaign} className="text-xs text-milou-500 hover:text-milou-700 font-medium">
                + Lägg till kampanj
              </button>
            </div>
            <div style={{ gridColumn: `span ${weekCount}` }} className="bg-gray-50 border-b border-gray-100" />
          </>
        )}

        {/* Budget summary */}
        <div className={`${cellClass} ${stickyClass} bg-white border-t-2 border-[#1C1C1C]`}>
          <span className="text-xs font-semibold text-[#6C6C6C] uppercase tracking-wide">Totalt</span>
        </div>
        {!compact && <div className={`${cellClass} bg-white border-t-2 border-[#1C1C1C]`} />}
        <div className={`${cellClass} bg-white border-t-2 border-[#1C1C1C] justify-end`}>
          <span className="text-sm font-bold text-[#1C1C1C]">{formatSEK(calcCampaignPlanTotal(plan))}</span>
        </div>
        <div style={{ gridColumn: `span ${weekCount}` }} className="bg-white border-t-2 border-[#1C1C1C]" />
      </div>
    </div>
  );
}

function CampaignSection({
  campaign, weeks, weekCount, readOnly, compact, getSpan, onCampaignUpdate, onDeleteCampaign, onPlanChanged, cellClass, stickyClass,
}: {
  campaign: Campaign & { platforms: CampaignPlatform[] };
  weeks: WeekColumn[];
  weekCount: number;
  readOnly?: boolean;
  compact?: boolean;
  getSpan: (s: string | null, e: string | null) => { colStart: number; colEnd: number } | null;
  onCampaignUpdate: (updates: Partial<Campaign>) => void;
  onDeleteCampaign: () => void;
  onPlanChanged: () => void;
  cellClass: string;
  stickyClass: string;
}) {
  const total = calcCampaignTotal(campaign.platforms);

  const handleAddPlatform = async () => {
    await createCampaignPlatform(campaign.id, "Ny plattform", campaign.platforms.length);
    onPlanChanged();
  };

  const handleDeletePlatform = async (id: string) => {
    await deleteCampaignPlatform(id);
    onPlanChanged();
  };

  const handlePlatformUpdate = async (id: string, updates: Partial<CampaignPlatform>) => {
    await updateCampaignPlatform(id, updates);
    onPlanChanged();
  };

  return (
    <>
      <div
        className={`${cellClass} ${stickyClass} font-bold text-sm`}
        style={{
          gridColumn: `1 / span 2`,
          backgroundColor: campaign.color + "22",
          borderLeft: `3px solid ${campaign.color}`,
          borderTop: `2px solid ${campaign.color}55`,
        }}
      >
        {readOnly ? (
          <span style={{ color: campaign.color }}>{campaign.name}</span>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <ColorDot color={campaign.color} onChange={(color) => onCampaignUpdate({ color })} />
            <InlineEdit
              value={campaign.name}
              onSave={(name) => onCampaignUpdate({ name })}
              className="font-bold text-sm"
              style={{ color: campaign.color }}
            />
            <button onClick={onDeleteCampaign} className="text-red-300 hover:text-red-500 text-xs ml-auto">×</button>
          </div>
        )}
      </div>
      {!compact && (
        <div className={`${cellClass} justify-end text-xs font-semibold`} style={{ backgroundColor: campaign.color + "22", borderTop: `2px solid ${campaign.color}55` }}>
          <span style={{ color: campaign.color, opacity: 0.7 }}>{formatSEK(total)}</span>
        </div>
      )}
      <div style={{ gridColumn: `span ${weekCount}`, backgroundColor: campaign.color + "11", borderTop: `2px solid ${campaign.color}55` }} className="relative border-b border-gray-100" />

      {campaign.platforms.map((platform) => (
        <PlatformRow
          key={platform.id}
          platform={platform}
          weeks={weeks}
          weekCount={weekCount}
          readOnly={readOnly}
          compact={compact}
          span={getSpan(platform.start_date, platform.end_date)}
          onUpdate={(updates) => handlePlatformUpdate(platform.id, updates)}
          onDelete={() => handleDeletePlatform(platform.id)}
          cellClass={cellClass}
          stickyClass={stickyClass}
        />
      ))}

      {!readOnly && (
        <>
          <div className={`${cellClass} ${stickyClass} bg-gray-50`} style={{ gridColumn: `1 / span 3` }}>
            <button onClick={handleAddPlatform} className="text-xs text-milou-500 hover:text-milou-700">
              + Lägg till plattform
            </button>
          </div>
          <div style={{ gridColumn: `span ${weekCount}` }} className="bg-gray-50 border-b border-gray-100" />
        </>
      )}
    </>
  );
}

function PlatformRow({
  platform, weeks, weekCount, readOnly, compact, span, onUpdate, onDelete, cellClass, stickyClass,
}: {
  platform: CampaignPlatform;
  weeks: WeekColumn[];
  weekCount: number;
  readOnly?: boolean;
  compact?: boolean;
  span: { colStart: number; colEnd: number } | null;
  onUpdate: (updates: Partial<CampaignPlatform>) => void;
  onDelete: () => void;
  cellClass: string;
  stickyClass: string;
}) {
  const color = PLATFORM_STATUS_COLORS[platform.status];

  return (
    <>
      <div className={`${cellClass} ${stickyClass} gap-1.5 group`}>
        {!readOnly && <ColorDot color={platform.color} onChange={(c) => onUpdate({ color: c })} />}
        {readOnly ? (
          <span className="text-xs">{platform.platform_name}</span>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <InlineEdit
              value={platform.platform_name}
              onSave={(platform_name) => onUpdate({ platform_name })}
              className="text-xs flex-1 min-w-0"
            />
            <button onClick={onDelete} className="text-red-300 hover:text-red-500 text-xs shrink-0">×</button>
          </div>
        )}
      </div>

      <div className={`${cellClass}`}>
        {readOnly ? (
          <span className="text-xs" style={{ color }}>{PLATFORM_STATUS_LABELS[platform.status]}</span>
        ) : (
          <select
            value={platform.status}
            onChange={(e) => onUpdate({ status: e.target.value as CampaignPlatformStatus })}
            className="text-xs w-full bg-transparent border-0 focus:outline-none cursor-pointer"
            style={{ color }}
          >
            {(Object.keys(PLATFORM_STATUS_LABELS) as CampaignPlatformStatus[]).map((s) => (
              <option key={s} value={s}>{PLATFORM_STATUS_LABELS[s]}</option>
            ))}
          </select>
        )}
      </div>

      {!compact && (
        <div className={`${cellClass} justify-end`}>
          {readOnly ? (
            <span>{platform.budget ? platform.budget.toLocaleString("sv-SE") : "–"}</span>
          ) : (
            <InlineEdit
              value={platform.budget ? String(platform.budget) : ""}
              onSave={(v) => onUpdate({ budget: v ? Number(v) : null })}
              type="number"
              placeholder="–"
              className="text-xs text-right w-full"
            />
          )}
        </div>
      )}

      <div style={{ gridColumn: `span ${weekCount}` }} className="relative border-b border-gray-100 bg-white h-9 flex items-center">
        {span ? (
          <div
            style={{
              position: "absolute",
              left: `${((span.colStart - 1) / weekCount) * 100}%`,
              width: `${Math.max(((span.colEnd - span.colStart) / weekCount) * 100, 0.5)}%`,
              backgroundColor: platform.color,
              top: "15%",
              height: "70%",
              borderRadius: "4px",
              opacity: platform.status === "inaktiv" ? 0.35 : 1,
            }}
            title={`${platform.platform_name}: v.${span.colStart} – v.${span.colEnd - 1}`}
          />
        ) : (
          !readOnly && (
            <div className="absolute inset-0 flex items-center px-2">
              <div className="flex gap-1">
                <input
                  type="date"
                  value={platform.start_date ?? ""}
                  onChange={(e) => onUpdate({ start_date: e.target.value })}
                  className="border-0 bg-transparent text-xs text-gray-500 cursor-pointer"
                />
                <input
                  type="date"
                  value={platform.end_date ?? ""}
                  onChange={(e) => onUpdate({ end_date: e.target.value })}
                  className="border-0 bg-transparent text-xs text-gray-500 cursor-pointer"
                />
              </div>
            </div>
          )
        )}
        {span && !readOnly && (
          <div className="absolute inset-0 flex items-center gap-1 px-2 opacity-0 hover:opacity-100 transition-opacity bg-white/80">
            <input
              type="date"
              value={platform.start_date ?? ""}
              onChange={(e) => onUpdate({ start_date: e.target.value })}
              className="border-0 bg-transparent text-[10px] text-gray-600 cursor-pointer"
            />
            <input
              type="date"
              value={platform.end_date ?? ""}
              onChange={(e) => onUpdate({ end_date: e.target.value })}
              className="border-0 bg-transparent text-[10px] text-gray-600 cursor-pointer"
            />
          </div>
        )}
      </div>
    </>
  );
}
