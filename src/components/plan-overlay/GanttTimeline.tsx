"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { format, differenceInWeeks } from "date-fns";
import type { FullMediaPlan, MediaPlan, MediaLine, MediaConcept, MediaCategory, MediaDeadline } from "@/lib/types";
import { getPlanWeeks, getMonthGroups, dateRangeToGridSpan, WeekColumn } from "@/lib/utils/dates";
import { calcLineTotal, calcCategoryTotal, calcCategoryReach, calcPlanTotal, formatSEK, formatReach } from "@/lib/utils/budget";
import { updatePlan } from "@/lib/api/plans";
import { updateLine, createLine, deleteLine, reorderLines } from "@/lib/api/lines";
import { updateCategory, createCategory, deleteCategory } from "@/lib/api/categories";
import { updateConcept, createConcept, deleteConcept } from "@/lib/api/concepts";
import { createDeadline, updateDeadline, deleteDeadline } from "@/lib/api/deadlines";
import InlineEdit from "./InlineEdit";
import ColorDot from "./ColorDot";
import { AddButton, DeleteButton, LANE, isLight, laneStyle, lineShade } from "@/components/shared/timeline";

const INFO_COLS_FULL = "232px 96px 112px 64px 116px 100px";
const INFO_COLS_COMPACT = "232px 116px 100px";
const INFO_COL_COUNT_FULL = 6;
const INFO_COL_COUNT_COMPACT = 3;

function getDeadlineLeft(date: string, weeks: WeekColumn[], weekCount: number): number | null {
  const idx = weeks.findIndex(
    (w) => date >= format(w.startDate, "yyyy-MM-dd") && date <= format(w.endDate, "yyyy-MM-dd")
  );
  if (idx === -1) return null;
  return ((idx + 0.5) / weekCount) * 100;
}

function colToStartDate(col: number, weeks: WeekColumn[]): string {
  const idx = Math.max(0, Math.min(col - 1, weeks.length - 1));
  return format(weeks[idx].startDate, "yyyy-MM-dd");
}

function colToEndDate(colEnd: number, weeks: WeekColumn[]): string {
  const idx = Math.max(0, Math.min(colEnd - 2, weeks.length - 1));
  return format(weeks[idx].endDate, "yyyy-MM-dd");
}

interface Props {
  plan: FullMediaPlan;
  readOnly?: boolean;
  compact?: boolean;
  onPlanChanged: () => void;
}

export default function GanttTimeline({ plan, readOnly, compact, onPlanChanged }: Props) {
  const weeks = useMemo(() => getPlanWeeks(plan.period_start, plan.period_end), [plan.period_start, plan.period_end]);
  const months = useMemo(() => getMonthGroups(weeks), [weeks]);
  const weekCount = weeks.length;

  const INFO_COLS = compact ? INFO_COLS_COMPACT : INFO_COLS_FULL;
  const INFO_COL_COUNT = compact ? INFO_COL_COUNT_COMPACT : INFO_COL_COUNT_FULL;
  const gridCols = `${INFO_COLS} repeat(${weekCount}, minmax(20px, 1fr))`;

  const cellClass = "border-b border-gray-100 px-3 min-h-[48px] text-sm flex items-center";
  const stickyClass = "sticky left-0 z-10 bg-white";

  // ── Toasts ──────────────────────────────────────────────
  const [undoToast, setUndoToast] = useState<{ revert: () => void } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 5000);
  }, []);

  const showUndo = useCallback((revert: () => void) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({ revert });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  }, []);

  const handleUndo = () => {
    if (!undoToast) return;
    undoToast.revert();
    setUndoToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const getSpan = useCallback((startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    return dateRangeToGridSpan(startDate, endDate, weeks);
  }, [weeks]);

  const handleLineUpdate = async (lineId: string, updates: Partial<MediaLine>) => {
    const line = plan.categories.flatMap((c) => c.lines).find((l) => l.id === lineId);
    if (line) {
      const prev = Object.fromEntries(Object.keys(updates).map((k) => [k, line[k as keyof MediaLine]])) as Partial<MediaLine>;
      showUndo(() => updateLine(lineId, prev).then(onPlanChanged));
    }
    try {
      await updateLine(lineId, updates);
      onPlanChanged();
    } catch {
      showError("Kunde inte spara ändringen. Försök igen.");
    }
  };

  const handleConceptUpdate = async (conceptId: string, updates: Partial<MediaConcept>) => {
    const concept = plan.concepts.find((c) => c.id === conceptId);
    if (concept) {
      const prev = Object.fromEntries(Object.keys(updates).map((k) => [k, concept[k as keyof MediaConcept]])) as Partial<MediaConcept>;
      showUndo(() => updateConcept(conceptId, prev).then(onPlanChanged));
    }
    await updateConcept(conceptId, updates);
    onPlanChanged();
  };

  const handleAddLine = async (categoryId: string, sortOrder: number) => {
    await createLine(categoryId, plan.period_start, plan.period_end, sortOrder);
    onPlanChanged();
  };

  const handleReorderLine = async (categoryId: string, lineId: string, direction: "up" | "down") => {
    const category = plan.categories.find((c) => c.id === categoryId);
    if (!category) return;
    const idx = category.lines.findIndex((l) => l.id === lineId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= category.lines.length) return;
    const newOrder = [...category.lines];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    try {
      await reorderLines(newOrder.map((line, i) => ({ id: line.id, sort_order: i })));
      onPlanChanged();
    } catch {
      showError("Kunde inte ändra ordningen. Försök igen.");
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      await deleteLine(lineId);
      onPlanChanged();
    } catch {
      showError("Kunde inte ta bort raden. Försök igen.");
    }
  };

  const handleAddCategory = async () => {
    try {
      await createCategory(plan.id, "Ny kategori", plan.categories.length);
      onPlanChanged();
    } catch {
      showError("Kunde inte lägga till kategori. Försök igen.");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Ta bort kategorin och alla dess rader?")) return;
    await deleteCategory(categoryId);
    onPlanChanged();
  };

  const handleAddConcept = async () => {
    await createConcept(plan.id, plan.period_start, plan.period_end, plan.concepts.length);
    onPlanChanged();
  };

  const handleDeleteConcept = async (conceptId: string) => {
    await deleteConcept(conceptId);
    onPlanChanged();
  };

  const handleAddDeadline = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    await createDeadline(plan.id, today);
    onPlanChanged();
  };

  const handleUpdateDeadline = async (id: string, updates: Partial<MediaDeadline>) => {
    await updateDeadline(id, updates);
    onPlanChanged();
  };

  const handleDeleteDeadline = async (id: string) => {
    await deleteDeadline(id);
    onPlanChanged();
  };

  return (
    <>
    {/* Mobile fallback */}
    {!readOnly && (
      <div className="md:hidden flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
        <div className="text-3xl">🖥️</div>
        <p className="text-gray-600 font-medium">Öppna på en dator</p>
        <p className="text-gray-400 text-sm">Gantt-editorn kräver en större skärm för att fungera.</p>
      </div>
    )}

    {/* Undo toast */}
    {undoToast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
        <span>Ändring sparad</span>
        <button onClick={handleUndo} className="font-semibold text-milou-300 hover:text-milou-200 transition-colors">
          Ångra
        </button>
      </div>
    )}

    {/* Error toast */}
    {errorMsg && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-[#E60330] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
        <span>{errorMsg}</span>
        <button onClick={() => setErrorMsg(null)} className="font-semibold opacity-70 hover:opacity-100 transition-opacity">✕</button>
      </div>
    )}

    {(() => {
      const planWeeks = differenceInWeeks(new Date(plan.period_end), new Date(plan.period_start));
      if (planWeeks > 52) {
        return (
          <div className="mx-4 mt-2 mb-0 px-3 py-2 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs font-medium hidden md:block">
            Obs: planen sträcker sig över {planWeeks} veckor — stora Ganttar kan vara långsamma.
          </div>
        );
      }
      return null;
    })()}

    <div className="overflow-x-auto scrollbar-thin px-4 py-2 hidden md:block">
      <div
        style={{ display: "grid", gridTemplateColumns: gridCols }}
        className="min-w-max bg-white"
      >
        {/* ── Month header row ── */}
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

        {/* ── Column headers (info + week labels) ── */}
        {(compact ? ["Kanal", "Kostnad", "Räckvidd"] : ["Kanal", "À-pris", "Enhet", "Antal", "Kostnad", "Räckvidd"]).map((h, i) => (
          <div
            key={h}
            className={`${cellClass} ${i === 0 ? stickyClass : "bg-white"} min-h-[36px] text-xs text-gray-500 border-gray-200 ${
              ["À-pris", "Kostnad", "Räckvidd"].includes(h) ? "justify-end" : h === "Antal" ? "justify-center" : ""
            }`}
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

        {/* ── Deadline markers row ── */}
        {(plan.deadlines.length > 0 || !readOnly) && (
          <>
            <div
              className={`${cellClass} ${stickyClass} py-3 flex-col items-start justify-center gap-1.5`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {plan.deadlines.map((d) => (
                  <div key={d.id} className="group/dl flex items-center gap-2 shrink-0 text-xs">
                    {readOnly ? (
                      <>
                        <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="font-bold text-gray-900">{d.name}</span>
                        <span className="text-gray-500 tabular-nums">{d.date}</span>
                      </>
                    ) : (
                      <>
                        <ColorDot color={d.color} onChange={(color) => handleUpdateDeadline(d.id, { color })} />
                        <InlineEdit
                          value={d.name}
                          onSave={(name) => handleUpdateDeadline(d.id, { name })}
                          className="text-xs font-bold text-gray-900"
                        />
                        <input
                          type="date"
                          value={d.date}
                          onChange={(e) => handleUpdateDeadline(d.id, { date: e.target.value })}
                          className="text-xs text-gray-500 border-0 bg-transparent cursor-pointer tabular-nums"
                        />
                        <button
                          onClick={() => handleDeleteDeadline(d.id)}
                          title="Ta bort deadline"
                          className="text-gray-300 hover:text-milou-500 opacity-0 group-hover/dl:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {!readOnly && <AddButton onClick={handleAddDeadline}>Deadline</AddButton>}
              </div>
            </div>
            <div style={laneStyle(weekCount)} className={`${LANE} min-h-[48px]`}>
              {plan.deadlines.map((d) => {
                const left = getDeadlineLeft(d.date, weeks, weekCount);
                if (left === null) return null;
                return (
                  <div key={d.id} style={{ position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: "1px", backgroundColor: d.color, zIndex: 4 }}>
                    <span
                      className="absolute top-2 left-0 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-white px-1.5 py-0.5"
                      style={{ backgroundColor: d.color }}
                    >
                      {d.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Concept bands ── */}
        {plan.concepts.map((concept) => {
          const span = getSpan(concept.start_date, concept.end_date);
          return (
            <GanttConceptRow
              key={concept.id}
              concept={concept}
              span={span}
              weeks={weeks}
              weekCount={weekCount}
              infoColCount={INFO_COL_COUNT}
              readOnly={readOnly}
              deadlines={plan.deadlines}
              onUpdate={(updates) => handleConceptUpdate(concept.id, updates)}
              onDelete={() => handleDeleteConcept(concept.id)}
              cellClass={cellClass}
              stickyClass={stickyClass}
            />
          );
        })}

        {!readOnly && (
          <>
            <div
              className={`${cellClass} ${stickyClass} min-h-[40px]`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              <AddButton onClick={handleAddConcept}>Koncept</AddButton>
            </div>
            <div style={laneStyle(weekCount)} className={LANE} />
          </>
        )}

        {/* ── Category rows ── */}
        {plan.categories.map((cat) => (
          <GanttCategorySection
            key={cat.id}
            category={cat}
            plan={plan}
            weeks={weeks}
            weekCount={weekCount}
            infoColCount={INFO_COL_COUNT}
            readOnly={readOnly}
            compact={compact}
            deadlines={plan.deadlines}
            getSpan={getSpan}
            onLineUpdate={handleLineUpdate}
            onDeleteLine={handleDeleteLine}
            onAddLine={() => handleAddLine(cat.id, cat.lines.length)}
            onReorderLine={(lineId, dir) => handleReorderLine(cat.id, lineId, dir)}
            onCategoryUpdate={(updates) => updateCategory(cat.id, updates).then(onPlanChanged)}
            onDeleteCategory={() => handleDeleteCategory(cat.id)}
            cellClass={cellClass}
            stickyClass={stickyClass}
          />
        ))}

        {/* ── Add category ── */}
        {!readOnly && (
          <>
            <div
              className={`${cellClass} ${stickyClass} min-h-[56px]`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              <AddButton onClick={handleAddCategory}>Kategori</AddButton>
            </div>
            <div style={laneStyle(weekCount)} className={LANE} />
          </>
        )}

        {/* ── Budget summary row ── */}
        <BudgetSummaryRow plan={plan} infoColCount={INFO_COL_COUNT} weekCount={weekCount} cellClass={cellClass} stickyClass={stickyClass} readOnly={readOnly} compact={compact} onPlanUpdate={async (updates) => { await updatePlan(plan.id, updates); onPlanChanged(); }} />
      </div>
    </div>
    </>
  );
}

/* ─── Concept Row ───────────────────────────────────────── */
function GanttConceptRow({
  concept, span, weeks, weekCount, infoColCount, readOnly, deadlines, onUpdate, onDelete, cellClass, stickyClass,
}: {
  concept: MediaConcept;
  span: { colStart: number; colEnd: number } | null;
  weeks: WeekColumn[];
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
  deadlines: MediaDeadline[];
  onUpdate: (updates: Partial<MediaConcept>) => void;
  onDelete: () => void;
  cellClass: string;
  stickyClass: string;
}) {
  return (
    <>
      <div
        className={`${cellClass} ${stickyClass} group/row`}
        style={{ gridColumn: `1 / span ${infoColCount}` }}
      >
        {readOnly ? (
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 shrink-0 border-2" style={{ borderColor: concept.color }} />
            <span className="font-bold text-gray-900">{concept.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <ColorDot
              color={concept.color}
              onChange={(color) => onUpdate({ color })}
            />
            <InlineEdit
              value={concept.name}
              onSave={(name) => onUpdate({ name })}
              className="font-bold text-sm text-gray-900"
            />
            <div className="ml-auto flex items-center gap-1 text-gray-500">
              <input
                type="date"
                value={concept.start_date}
                onChange={(e) => onUpdate({ start_date: e.target.value })}
                className="text-xs border-0 bg-transparent cursor-pointer tabular-nums"
              />
              <span aria-hidden className="text-gray-300">till</span>
              <input
                type="date"
                value={concept.end_date}
                onChange={(e) => onUpdate({ end_date: e.target.value })}
                className="text-xs border-0 bg-transparent cursor-pointer tabular-nums"
              />
              <DeleteButton onClick={onDelete} title="Ta bort koncept" />
            </div>
          </div>
        )}
      </div>

      {/* Timeline band: koncept ritas som kontur, mediaraderna som fyllda staplar */}
      <div style={laneStyle(weekCount)} className={`${LANE} flex items-center`}>
        {span && (
          <div
            style={{
              position: "absolute",
              left: `${((span.colStart - 1) / weekCount) * 100}%`,
              width: `${((span.colEnd - span.colStart) / weekCount) * 100}%`,
              borderColor: concept.color,
            }}
            className="h-7 border-2 bg-white flex items-center px-2.5 z-[5]"
          >
            <span className="text-xs font-bold truncate" style={{ color: isLight(concept.color) ? "#1C1C1C" : concept.color }}>
              {concept.name}
            </span>
          </div>
        )}
        <DeadlineMarkers deadlines={deadlines} weeks={weeks} weekCount={weekCount} />
      </div>
    </>
  );
}

/* ─── Category Section ──────────────────────────────────── */
function GanttCategorySection({
  category, plan, weeks, weekCount, infoColCount, readOnly, compact, deadlines, getSpan,
  onLineUpdate, onDeleteLine, onAddLine, onReorderLine, onCategoryUpdate, onDeleteCategory,
  cellClass, stickyClass,
}: {
  category: MediaCategory & { lines: MediaLine[] };
  plan: FullMediaPlan;
  weeks: WeekColumn[];
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
  compact?: boolean;
  deadlines: MediaDeadline[];
  getSpan: (s: string | null, e: string | null) => { colStart: number; colEnd: number } | null;
  onLineUpdate: (id: string, updates: Partial<MediaLine>) => void;
  onDeleteLine: (id: string) => void;
  onAddLine: () => void;
  onReorderLine: (lineId: string, direction: "up" | "down") => void;
  onCategoryUpdate: (updates: Partial<MediaCategory>) => void;
  onDeleteCategory: () => void;
  cellClass: string;
  stickyClass: string;
}) {
  const total = calcCategoryTotal(category.lines);
  const reach = calcCategoryReach(category.lines);
  const accent = { boxShadow: `inset 4px 0 0 ${category.color}` };

  // Kategorins hela utsträckning, som en tunn linje i rubrikraden.
  const spans = category.lines.map((l) => getSpan(l.start_date, l.end_date)).filter((x): x is { colStart: number; colEnd: number } => !!x);
  const extent = spans.length
    ? { colStart: Math.min(...spans.map((x) => x.colStart)), colEnd: Math.max(...spans.map((x) => x.colEnd)) }
    : null;

  return (
    <>
      {/* Luft mellan kategorierna */}
      <div className={`${stickyClass} h-6`} style={{ gridColumn: `1 / span ${infoColCount}` }} />
      <div style={laneStyle(weekCount)} className="relative border-l border-gray-200 bg-white h-6" />

      {/* Category header — spans first (infoColCount-1) cols */}
      <div
        className={`${cellClass} ${stickyClass} group/row min-h-[52px] border-gray-200`}
        style={{ gridColumn: `1 / span ${infoColCount - 1}`, ...accent }}
      >
        <div className="flex items-center gap-2.5 w-full pl-1">
          {readOnly ? (
            <span className="w-3 h-3 shrink-0" style={{ backgroundColor: category.color }} />
          ) : (
            <ColorDot color={category.color} onChange={(color) => onCategoryUpdate({ color })} />
          )}
          {readOnly ? (
            <span className="font-display font-bold text-base text-gray-900">{category.name}</span>
          ) : (
            <InlineEdit
              value={category.name}
              onSave={(name) => onCategoryUpdate({ name })}
              className="font-display font-bold text-base text-gray-900"
            />
          )}
          {!readOnly && <DeleteButton onClick={onDeleteCategory} title="Ta bort kategori" />}
          <span className="ml-auto font-bold text-gray-900 tabular-nums">{formatSEK(total)}</span>
        </div>
      </div>
      {/* Category reach col */}
      <div className={`${cellClass} min-h-[52px] border-gray-200 justify-end font-bold text-gray-900 tabular-nums`}>
        {formatReach(reach)}
      </div>
      <div style={laneStyle(weekCount)} className={`${LANE} border-b-gray-200`}>
        {extent && (
          <div
            className="absolute bottom-0 h-1"
            style={{
              left: `${((extent.colStart - 1) / weekCount) * 100}%`,
              width: `${((extent.colEnd - extent.colStart) / weekCount) * 100}%`,
              backgroundColor: category.color,
            }}
          />
        )}
        <DeadlineMarkers deadlines={deadlines} weeks={weeks} weekCount={weekCount} />
      </div>

      {/* Media lines */}
      {category.lines.map((line, idx) => (
        <GanttLineRow
          key={line.id}
          line={line}
          plan={plan}
          weeks={weeks}
          weekCount={weekCount}
          infoColCount={infoColCount}
          readOnly={readOnly}
          compact={compact}
          deadlines={deadlines}
          span={getSpan(line.start_date, line.end_date)}
          onUpdate={(updates) => onLineUpdate(line.id, updates)}
          onDelete={() => onDeleteLine(line.id)}
          onAddLine={!readOnly ? onAddLine : undefined}
          lineIndex={idx}
          lineCount={category.lines.length}
          barColor={lineShade(category.color, idx)}
          accentColor={category.color}
          onReorder={!readOnly ? (dir) => onReorderLine(line.id, dir) : undefined}
          cellClass={cellClass}
          stickyClass={stickyClass}
        />
      ))}

      {/* Add line */}
      {!readOnly && (
        <>
          <div
            className={`${cellClass} ${stickyClass} min-h-[40px] pl-8`}
            style={{ gridColumn: `1 / span ${infoColCount}`, ...accent }}
          >
            <AddButton onClick={onAddLine}>Rad</AddButton>
          </div>
          <div style={laneStyle(weekCount)} className={LANE} />
        </>
      )}
    </>
  );
}

/* ─── Line Row ──────────────────────────────────────────── */
type DragState = {
  type: "move" | "left" | "right";
  startX: number;
  startColStart: number;
  startColEnd: number;
};

function GanttLineRow({
  line, plan, weeks, weekCount, infoColCount, readOnly, compact, deadlines, span, onUpdate, onDelete, onAddLine, lineIndex, lineCount, onReorder, barColor, accentColor, cellClass, stickyClass,
}: {
  line: MediaLine;
  plan: FullMediaPlan;
  weeks: WeekColumn[];
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
  compact?: boolean;
  deadlines: MediaDeadline[];
  span: { colStart: number; colEnd: number } | null;
  onUpdate: (updates: Partial<MediaLine>) => void;
  onDelete: () => void;
  onAddLine?: () => void;
  lineIndex?: number;
  lineCount?: number;
  onReorder?: (direction: "up" | "down") => void;
  barColor: string;
  accentColor: string;
  cellClass: string;
  stickyClass: string;
}) {
  const total = calcLineTotal(line);
  const containerRef = useRef<HTMLDivElement>(null);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const [isDragging, setIsDragging] = useState(false);
  const [displaySpan, setDisplaySpan] = useState(span);
  const [deadlineDragging, setDeadlineDragging] = useState(false);
  const [displayDeadlineDate, setDisplayDeadlineDate] = useState<string | null>(line.deadline_date);
  const displayDeadlineDateRef = useRef<string | null>(line.deadline_date);
  const deadlineDragRef = useRef<{ startX: number; startWeekIdx: number } | null>(null);
  const displaySpanRef = useRef(span);
  const dragStateRef = useRef<DragState | null>(null);

  // Sync bar span from prop when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDisplaySpan(span);
      displaySpanRef.current = span;
    }
  }, [span, isDragging]);

  // Sync deadline from prop when not dragging
  useEffect(() => {
    if (!deadlineDragging) {
      setDisplayDeadlineDate(line.deadline_date);
      displayDeadlineDateRef.current = line.deadline_date;
    }
  }, [line.deadline_date, deadlineDragging]);

  const startDrag = useCallback((e: React.PointerEvent, type: DragState["type"]) => {
    if (readOnly || !span) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { type, startX: e.clientX, startColStart: span.colStart, startColEnd: span.colEnd };
    setIsDragging(true);
  }, [readOnly, span]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || !containerRef.current) return;

      const colWidth = containerRef.current.offsetWidth / weekCount;
      const delta = Math.round((e.clientX - drag.startX) / colWidth);
      const spanWidth = drag.startColEnd - drag.startColStart;

      let newColStart = drag.startColStart;
      let newColEnd = drag.startColEnd;

      if (drag.type === "move") {
        newColStart = Math.max(1, Math.min(drag.startColStart + delta, weekCount - spanWidth + 1));
        newColEnd = newColStart + spanWidth;
      } else if (drag.type === "left") {
        newColStart = Math.max(1, Math.min(drag.startColStart + delta, drag.startColEnd - 1));
      } else {
        newColEnd = Math.max(drag.startColStart + 1, Math.min(drag.startColEnd + delta, weekCount + 1));
      }

      const newSpan = { colStart: newColStart, colEnd: newColEnd };
      displaySpanRef.current = newSpan;
      setDisplaySpan(newSpan);
    };

    const onUp = () => {
      const finalSpan = displaySpanRef.current;
      if (finalSpan) {
        // Clamp to plan period (weeks already derived from it, but be explicit)
        const start = colToStartDate(Math.max(1, finalSpan.colStart), weeks);
        const end = colToEndDate(Math.min(weekCount + 1, finalSpan.colEnd), weeks);
        onUpdateRef.current({ start_date: start, end_date: end });
      }
      dragStateRef.current = null;
      setIsDragging(false);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [isDragging, weekCount, weeks]);

  useEffect(() => {
    if (!deadlineDragging) return;
    const onMove = (e: PointerEvent) => {
      const drag = deadlineDragRef.current;
      if (!drag || !containerRef.current) return;
      const colWidth = containerRef.current.offsetWidth / weekCount;
      const delta = Math.round((e.clientX - drag.startX) / colWidth);
      const newIdx = Math.max(0, Math.min(drag.startWeekIdx + delta, weekCount - 1));
      const newDate = format(weeks[newIdx].startDate, "yyyy-MM-dd");
      displayDeadlineDateRef.current = newDate;
      setDisplayDeadlineDate(newDate);
    };
    const onUp = () => {
      if (displayDeadlineDateRef.current) onUpdateRef.current({ deadline_date: displayDeadlineDateRef.current, deadline_label: null });
      setDeadlineDragging(false);
      deadlineDragRef.current = null;
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
  }, [deadlineDragging, weekCount, weeks]);

  const startDeadlineDrag = useCallback((e: React.PointerEvent) => {
    if (!displayDeadlineDateRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const weekIdx = weeks.findIndex(
      (w) => displayDeadlineDateRef.current! >= format(w.startDate, "yyyy-MM-dd") && displayDeadlineDateRef.current! <= format(w.endDate, "yyyy-MM-dd")
    );
    deadlineDragRef.current = { startX: e.clientX, startWeekIdx: weekIdx >= 0 ? weekIdx : 0 };
    setDeadlineDragging(true);
  }, [weeks]);

  const handleAddDeadline = useCallback(() => {
    const date = displaySpanRef.current
      ? format(weeks[Math.max(0, displaySpanRef.current.colStart - 1)].startDate, "yyyy-MM-dd")
      : format(weeks[Math.floor(weekCount / 2)].startDate, "yyyy-MM-dd");
    onUpdateRef.current({ deadline_date: date, deadline_label: null });
  }, [weeks, weekCount]);

  return (
    <>
      {/* Platform name */}
      <div className={`${cellClass} ${stickyClass} gap-2 group pl-4`} style={{ boxShadow: `inset 4px 0 0 ${accentColor}` }}>
        {!readOnly && onReorder ? (
          <div className="flex flex-col gap-0 shrink-0 w-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReorder("up")}
              disabled={lineIndex === 0}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none"
              style={{ fontSize: "9px" }}
              title="Flytta upp"
            >▲</button>
            <button
              onClick={() => onReorder("down")}
              disabled={lineIndex === undefined || lineCount === undefined || lineIndex >= lineCount - 1}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none"
              style={{ fontSize: "9px" }}
              title="Flytta ner"
            >▼</button>
          </div>
        ) : (
          <span className="w-2 shrink-0" />
        )}
        <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: barColor }} aria-hidden />
        {readOnly ? (
          <span className="text-gray-900 truncate">{line.platform_name}</span>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <InlineEdit
              value={line.platform_name}
              onSave={(platform_name) => onUpdate({ platform_name })}
              className="text-sm text-gray-900 flex-1 min-w-0"
            />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteButton onClick={onDelete} title="Ta bort rad" />
            </span>
          </div>
        )}
      </div>

      {/* Cost per unit — hidden in compact mode */}
      {!compact && (
        <div className={`${cellClass} justify-end`}>
          {readOnly ? (
            <span className="text-gray-700 tabular-nums">{line.cost_per_unit?.toLocaleString("sv-SE") ?? "–"}</span>
          ) : (
            <InlineEdit
              value={String(line.cost_per_unit ?? 0)}
              onSave={(v) => onUpdate({ cost_per_unit: Number(v) || 0 })}
              type="number"
              className="text-sm text-right w-full tabular-nums"
            />
          )}
        </div>
      )}

      {/* Unit type — hidden in compact mode */}
      {!compact && (
        <div className={`${cellClass}`}>
          {readOnly ? (
            <span className="truncate text-gray-700">{line.unit_type}</span>
          ) : (
            <select
              value={line.unit_type}
              onChange={(e) => onUpdate({ unit_type: e.target.value })}
              className="text-sm text-gray-700 w-full bg-transparent border-0 focus:outline-none cursor-pointer"
            >
              {["per månad", "per vecka", "per sida", "per dagar", "fast pris"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Quantity — hidden in compact mode */}
      {!compact && (
        <div className={`${cellClass} justify-center`}>
          {readOnly ? (
            <span className="text-gray-700 tabular-nums">{line.quantity}</span>
          ) : (
            <InlineEdit
              value={String(line.quantity ?? 0)}
              onSave={(v) => onUpdate({ quantity: Number(v) || 0 })}
              type="number"
              className="text-sm text-center w-full tabular-nums"
            />
          )}
        </div>
      )}

      {/* Total */}
      <div className={`${cellClass} justify-end text-gray-900 tabular-nums`}>
        {formatSEK(total)}
      </div>

      {/* Estimated reach */}
      <div className={`${cellClass} justify-end`}>
        {readOnly ? (
          <span className="text-gray-700 tabular-nums">{line.estimated_reach ? formatReach(line.estimated_reach) : "–"}</span>
        ) : (
          <InlineEdit
            value={line.estimated_reach ? String(line.estimated_reach) : ""}
            onSave={(v) => onUpdate({ estimated_reach: v ? Number(v) : null })}
            onTabOut={onAddLine}
            type="number"
            className="text-sm text-gray-700 text-right w-full tabular-nums"
            placeholder="–"
          />
        )}
      </div>

      {/* Gantt bar cell */}
      <div
        ref={containerRef}
        style={laneStyle(weekCount)}
        className={`${LANE} group/bar`}
      >
        <DeadlineMarkers deadlines={deadlines} weeks={weeks} weekCount={weekCount} />

        {/* Row-level deadline marker — draggable, shows week date to the left */}
        {displayDeadlineDate && (() => {
          const dlLeft = getDeadlineLeft(displayDeadlineDate, weeks, weekCount);
          if (dlLeft === null) return null;
          const dlWeekIdx = weeks.findIndex(
            (w) => displayDeadlineDate >= format(w.startDate, "yyyy-MM-dd") && displayDeadlineDate <= format(w.endDate, "yyyy-MM-dd")
          );
          const dlLabel = dlWeekIdx >= 0 ? weeks[dlWeekIdx].label : displayDeadlineDate;
          return (
            <div
              style={{ position: "absolute", left: `${dlLeft}%`, top: 0, bottom: 0, width: "2px", backgroundColor: "#ef4444", zIndex: 6, cursor: deadlineDragging ? "grabbing" : (readOnly ? "default" : "grab"), userSelect: "none" }}
              onPointerDown={!readOnly ? startDeadlineDrag : undefined}
            >
              <span
                style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: "#ef4444", whiteSpace: "nowrap", fontWeight: 700, backgroundColor: "rgba(255,255,255,0.92)", padding: "0 2px", borderRadius: "2px" }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {readOnly ? (line.deadline_label || dlLabel) : (
                  <InlineEdit
                    value={line.deadline_label || dlLabel}
                    onSave={(v) => onUpdate({ deadline_label: v || null })}
                    style={{ fontSize: "9px", color: "#ef4444", fontWeight: 700 }}
                  />
                )}
              </span>
              {!readOnly && !deadlineDragging && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onUpdate({ deadline_date: null, deadline_label: null }); }}
                  style={{ position: "absolute", top: "2px", left: "4px", fontSize: "11px", color: "#ef4444", lineHeight: 1 }}
                  title="Ta bort deadline"
                >×</button>
              )}
            </div>
          );
        })()}

        {!readOnly && !line.deadline_date && !isDragging && (
          <button
            onClick={handleAddDeadline}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 6, userSelect: "none" }}
            className="text-gray-300 hover:text-[#E60330] opacity-0 group-hover/bar:opacity-100 transition-opacity"
            title="Lägg till deadline"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 inline-block">
              <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.654-1.646.632-.572-.022-1.073-.262-1.36-.35l-3.01 3.01c.171.592.274 1.237.046 1.845-.158.419-.429.733-.741.985L5.17 14.396a.5.5 0 0 1-.707-.707l1.965-1.965-.656-.657-1.965 1.966a.5.5 0 0 1-.707-.708l1.757-1.757-1.072-1.072-1.757 1.757a.5.5 0 0 1-.707-.707l2.028-2.028c.252-.311.566-.583.985-.74.608-.228 1.253-.126 1.845.045l3.01-3.01c-.088-.287-.328-.788-.35-1.36-.022-.574.152-1.165.632-1.645a.5.5 0 0 1 .353-.147z"/>
            </svg>
          </button>
        )}

        {displaySpan ? (
          <div
            style={{
              position: "absolute",
              left: `${((displaySpan.colStart - 1) / weekCount) * 100}%`,
              width: `${Math.max(((displaySpan.colEnd - displaySpan.colStart) / weekCount) * 100, 0.5)}%`,
              backgroundColor: barColor,
              top: "50%",
              height: "20px",
              transform: "translateY(-50%)",
              zIndex: 5,
              cursor: isDragging ? "grabbing" : (readOnly ? "default" : "grab"),
              userSelect: "none",
            }}
            onPointerDown={!readOnly ? (e) => startDrag(e, "move") : undefined}
            title={`${line.platform_name}: v.${displaySpan.colStart} – v.${displaySpan.colEnd - 1}`}
          >
            {!readOnly && (
              <>
                {/* Left resize handle */}
                <div
                  className="opacity-0 group-hover/bar:opacity-100 transition-opacity"
                  style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: "6px",
                    cursor: "w-resize",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                  onPointerDown={(e) => { e.stopPropagation(); startDrag(e, "left"); }}
                />
                {/* Right resize handle */}
                <div
                  className="opacity-0 group-hover/bar:opacity-100 transition-opacity"
                  style={{
                    position: "absolute",
                    right: 0, top: 0, bottom: 0,
                    width: "6px",
                    cursor: "e-resize",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                  onPointerDown={(e) => { e.stopPropagation(); startDrag(e, "right"); }}
                />
              </>
            )}
          </div>
        ) : (
          !readOnly && (
            <div className="absolute inset-0 flex items-center px-2">
              <div className="flex gap-1">
                <input
                  type="date"
                  value={line.start_date ?? ""}
                  min={plan.period_start}
                  max={plan.period_end}
                  onChange={(e) => onUpdate({ start_date: e.target.value })}
                  className="border-0 bg-transparent text-xs text-gray-500 cursor-pointer"
                />
                <input
                  type="date"
                  value={line.end_date ?? ""}
                  min={plan.period_start}
                  max={plan.period_end}
                  onChange={(e) => onUpdate({ end_date: e.target.value })}
                  className="border-0 bg-transparent text-xs text-gray-500 cursor-pointer"
                />
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}

/* ─── Deadline Markers ──────────────────────────────────── */
function DeadlineMarkers({ deadlines, weeks, weekCount }: { deadlines: MediaDeadline[]; weeks: WeekColumn[]; weekCount: number }) {
  return (
    <>
      {deadlines.map((d) => {
        const left = getDeadlineLeft(d.date, weeks, weekCount);
        if (left === null) return null;
        return (
          <div
            key={d.id}
            style={{ position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: "1px", backgroundColor: d.color, opacity: 0.45, zIndex: 4, pointerEvents: "none" }}
          />
        );
      })}
    </>
  );
}

/* ─── Budget Summary ────────────────────────────────────── */
function BudgetSummaryRow({
  plan, infoColCount, weekCount, cellClass, stickyClass, readOnly, compact, onPlanUpdate,
}: {
  plan: FullMediaPlan;
  infoColCount: number;
  weekCount: number;
  cellClass: string;
  stickyClass: string;
  readOnly?: boolean;
  compact?: boolean;
  onPlanUpdate: (updates: Partial<MediaPlan>) => Promise<void>;
}) {
  const totalReach = plan.categories.reduce((sum, cat) => sum + calcCategoryReach(cat.lines), 0);

  const summaryBorder = "border-t-2 border-b-0 border-gray-900 min-h-[60px] mt-6";

  return (
    <>
      {/* Col 1: "Budget" label — matches Kanal/Plattform column */}
      <div className={`${cellClass} ${stickyClass} bg-white ${summaryBorder}`}>
        <span className="font-display font-bold text-base text-gray-900">Totalt</span>
      </div>

      {/* Middle info cols (full) or just Totalt col (compact) */}
      {!compact && (
        <>
          <div className={`${cellClass} bg-white ${summaryBorder}`} />
          <div className={`${cellClass} bg-white ${summaryBorder}`} />
          <div className={`${cellClass} bg-white ${summaryBorder}`} />
        </>
      )}

      {/* Totalt col */}
      <div className={`${cellClass} bg-white ${summaryBorder} justify-end`}>
        {!readOnly ? (
          <InlineEdit
            value={plan.planned_budget ? String(plan.planned_budget) : ""}
            onSave={(v) => onPlanUpdate({ planned_budget: v ? Number(v) : null })}
            type="number"
            placeholder="–"
            className="font-display font-bold text-base text-gray-900 text-right w-full tabular-nums"
          />
        ) : (
          // The client sees the sum of the lines, same figure as "Total budget" in the header.
          // planned_budget is an internal frame and is only shown in the editor.
          <span className="font-display font-bold text-base text-gray-900 tabular-nums">
            {formatSEK(calcPlanTotal(plan))}
          </span>
        )}
      </div>

      {/* Räckvidd col */}
      <div className={`${cellClass} bg-white ${summaryBorder} justify-end`}>
        <span className="font-display font-bold text-base text-gray-900 tabular-nums">{formatReach(totalReach)}</span>
      </div>

      {/* Timeline area — white, no gray */}
      <div style={{ gridColumn: `span ${weekCount}` }} className={`bg-white ${summaryBorder}`} />
    </>
  );
}

