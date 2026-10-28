"use client";

import { useMemo } from "react";
import type { FullCampaignPlan, Campaign, CampaignPlatform, CampaignPlatformStatus } from "@/lib/types";
import { getPlanWeeks, getMonthGroups, dateRangeToGridSpan, WeekColumn } from "@/lib/utils/dates";
import { calcCampaignTotal, calcCampaignPlanTotal, formatSEK, PLATFORM_STATUS_LABELS, PLATFORM_STATUS_COLORS } from "@/lib/utils/campaign-budget";
import { updateCampaign, deleteCampaign, createCampaign } from "@/lib/api/campaigns";
import { updateCampaignPlatform, deleteCampaignPlatform, createCampaignPlatform } from "@/lib/api/campaign-platforms";
import InlineEdit from "@/components/plan-overlay/InlineEdit";
import ColorDot from "@/components/plan-overlay/ColorDot";
import { AddButton, DeleteButton, LANE, laneStyle, lineShade } from "@/components/shared/timeline";

const INFO_COLS_FULL = "232px 148px 116px";
const INFO_COLS_COMPACT = "232px 148px";

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

  const INFO_COL_COUNT = compact ? 2 : 3;
  const gridCols = `${compact ? INFO_COLS_COMPACT : INFO_COLS_FULL} repeat(${weekCount}, minmax(20px, 1fr))`;
  const cellClass = "border-b border-gray-100 px-3 min-h-[48px] text-sm flex items-center";
  const stickyClass = "sticky left-0 z-10 bg-white";

  const getSpan = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    return dateRangeToGridSpan(startDate, endDate, weeks);
  };

  const handleAddCampaign = async () => {
    await createCampaign(plan.id, "Ny kampanj", plan.campaigns.length);
    onPlanChanged();
  };

  const summaryBorder = "border-t-2 border-b-0 border-gray-900 min-h-[60px] mt-6";

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Ta bort kampanjen och alla dess plattformar?")) return;
    await deleteCampaign(id);
    onPlanChanged();
  };

  return (
    <div className="overflow-x-auto scrollbar-thin px-4 py-2 hidden md:block">
      <div
        style={{ display: "grid", gridTemplateColumns: gridCols }}
        className="min-w-max bg-white"
      >
        <div
          className={`${cellClass} ${stickyClass} border-b-0 min-h-[40px]`}
          style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
        />
        {months.map((m) => (
          <div
            key={m.label}
            className="min-h-[40px] px-3 flex items-end pb-1.5 border-l border-gray-200 font-display font-bold text-base text-gray-900 capitalize"
            style={{ gridColumn: `span ${m.spanCols}` }}
          >
            {m.label}
          </div>
        ))}

        {(compact ? ["Plattform", "Status"] : ["Plattform", "Status", "Budget"]).map((h, i) => (
          <div
            key={h}
            className={`${cellClass} ${i === 0 ? stickyClass : "bg-white"} min-h-[36px] text-xs text-gray-500 border-gray-200 ${h === "Budget" ? "justify-end" : ""}`}
          >
            {h}
          </div>
        ))}
        {weeks.map((w, i) => (
          <div
            key={w.index}
            className={`min-h-[36px] flex items-center justify-center border-b border-gray-200 text-xs text-gray-500 tabular-nums ${i === 0 ? "border-l border-l-gray-200" : "border-l border-l-[#EFEFEF]"}`}
          >
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
            <div className={`${stickyClass} h-6`} style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }} />
            <div style={laneStyle(weekCount)} className="relative border-l border-gray-200 bg-white h-6" />
            <div
              className={`${cellClass} ${stickyClass} min-h-[56px] border-t border-t-gray-100`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              <AddButton onClick={handleAddCampaign}>Kampanj</AddButton>
            </div>
            <div style={laneStyle(weekCount)} className={`${LANE} border-t border-t-gray-100`} />
          </>
        )}

        {/* Budget summary */}
        <div className={`${cellClass} ${stickyClass} ${summaryBorder}`}>
          <span className="font-display font-bold text-base text-gray-900">Totalt</span>
        </div>
        {!compact && <div className={`${cellClass} bg-white ${summaryBorder}`} />}
        <div className={`${cellClass} bg-white ${summaryBorder} justify-end`}>
          <span className="font-display font-bold text-base text-gray-900 tabular-nums">{formatSEK(calcCampaignPlanTotal(plan))}</span>
        </div>
        <div style={{ gridColumn: `span ${weekCount}` }} className={`bg-white ${summaryBorder}`} />
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
  const accent = { boxShadow: `inset 4px 0 0 ${campaign.color}` };

  // Kampanjens hela utsträckning, som en tunn linje i rubrikraden.
  const spans = campaign.platforms.map((p) => getSpan(p.start_date, p.end_date)).filter((x): x is { colStart: number; colEnd: number } => !!x);
  const extent = spans.length
    ? { colStart: Math.min(...spans.map((x) => x.colStart)), colEnd: Math.max(...spans.map((x) => x.colEnd)) }
    : null;

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
      {/* Luft mellan kampanjerna */}
      <div className={`${stickyClass} h-6`} style={{ gridColumn: `1 / span ${compact ? 2 : 3}` }} />
      <div style={laneStyle(weekCount)} className="relative border-l border-gray-200 bg-white h-6" />

      <div
        className={`${cellClass} ${stickyClass} min-h-[52px] border-gray-200`}
        style={{ gridColumn: `1 / span 2`, ...accent }}
      >
        <div className="flex items-center gap-2.5 w-full pl-1">
          {readOnly ? (
            <span className="w-3 h-3 shrink-0" style={{ backgroundColor: campaign.color }} />
          ) : (
            <ColorDot color={campaign.color} onChange={(color) => onCampaignUpdate({ color })} />
          )}
          {readOnly ? (
            <span className="font-display font-bold text-base text-gray-900">{campaign.name}</span>
          ) : (
            <>
              <InlineEdit
                value={campaign.name}
                onSave={(name) => onCampaignUpdate({ name })}
                className="font-display font-bold text-base text-gray-900"
              />
              <DeleteButton onClick={onDeleteCampaign} title="Ta bort kampanj" />
            </>
          )}
        </div>
      </div>
      {!compact && (
        <div className={`${cellClass} min-h-[52px] border-gray-200 justify-end font-bold text-gray-900 tabular-nums`}>
          {formatSEK(total)}
        </div>
      )}
      <div style={laneStyle(weekCount)} className={`${LANE} border-b-gray-200`}>
        {extent && (
          <div
            className="absolute bottom-0 h-1"
            style={{
              left: `${((extent.colStart - 1) / weekCount) * 100}%`,
              width: `${((extent.colEnd - extent.colStart) / weekCount) * 100}%`,
              backgroundColor: campaign.color,
            }}
          />
        )}
      </div>

      {campaign.platforms.map((platform, idx) => (
        <PlatformRow
          key={platform.id}
          platform={platform}
          barColor={lineShade(campaign.color, idx)}
          accentColor={campaign.color}
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
          <div className={`${cellClass} ${stickyClass} min-h-[40px] pl-8`} style={{ gridColumn: `1 / span ${compact ? 2 : 3}`, ...accent }}>
            <AddButton onClick={handleAddPlatform}>Plattform</AddButton>
          </div>
          <div style={laneStyle(weekCount)} className={LANE} />
        </>
      )}
    </>
  );
}

function PlatformRow({
  platform, weeks, weekCount, readOnly, compact, span, onUpdate, onDelete, barColor, accentColor, cellClass, stickyClass,
}: {
  platform: CampaignPlatform;
  barColor: string;
  accentColor: string;
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
      <div className={`${cellClass} ${stickyClass} gap-2 group pl-8`} style={{ boxShadow: `inset 4px 0 0 ${accentColor}` }}>
        <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: barColor }} aria-hidden />
        {readOnly ? (
          <span className="text-gray-900 truncate">{platform.platform_name}</span>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <InlineEdit
              value={platform.platform_name}
              onSave={(platform_name) => onUpdate({ platform_name })}
              className="text-sm text-gray-900 flex-1 min-w-0"
            />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteButton onClick={onDelete} title="Ta bort plattform" />
            </span>
          </div>
        )}
      </div>

      <div className={`${cellClass} gap-2`}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
        {readOnly ? (
          <span className="text-gray-700">{PLATFORM_STATUS_LABELS[platform.status]}</span>
        ) : (
          <select
            value={platform.status}
            onChange={(e) => onUpdate({ status: e.target.value as CampaignPlatformStatus })}
            className="text-sm text-gray-700 w-full bg-transparent border-0 focus:outline-none cursor-pointer"
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
            <span className="text-gray-900 tabular-nums">{platform.budget ? platform.budget.toLocaleString("sv-SE") : "–"}</span>
          ) : (
            <InlineEdit
              value={platform.budget ? String(platform.budget) : ""}
              onSave={(v) => onUpdate({ budget: v ? Number(v) : null })}
              type="number"
              placeholder="–"
              className="text-sm text-gray-900 text-right w-full tabular-nums"
            />
          )}
        </div>
      )}

      <div style={laneStyle(weekCount)} className={`${LANE} flex items-center`}>
        {span ? (
          <div
            style={{
              position: "absolute",
              left: `${((span.colStart - 1) / weekCount) * 100}%`,
              width: `${Math.max(((span.colEnd - span.colStart) / weekCount) * 100, 0.5)}%`,
              backgroundColor: barColor,
              top: "50%",
              height: "20px",
              transform: "translateY(-50%)",
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
          <div className="absolute inset-0 z-[6] flex items-center gap-1 px-2 opacity-0 hover:opacity-100 transition-opacity bg-white/90">
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
