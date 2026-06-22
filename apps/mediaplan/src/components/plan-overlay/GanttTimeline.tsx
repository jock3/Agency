"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import type { FullMediaPlan, MediaLine, MediaConcept, MediaCategory, MediaDeadline } from "@/lib/types";
import { getPlanWeeks, getMonthGroups, dateRangeToGridSpan, WeekColumn } from "@/lib/utils/dates";
import { calcLineTotal, calcCategoryTotal, formatSEK } from "@/lib/utils/budget";
import { updateLine, createLine, deleteLine } from "@/lib/api/lines";
import { updateCategory, createCategory, deleteCategory } from "@/lib/api/categories";
import { updateConcept, createConcept, deleteConcept } from "@/lib/api/concepts";
import { createDeadline, updateDeadline, deleteDeadline } from "@/lib/api/deadlines";
import InlineEdit from "./InlineEdit";
import ColorDot from "./ColorDot";

const INFO_COLS = "200px 80px 90px 60px 100px";
const INFO_COL_COUNT = 5;

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
  onPlanChanged: () => void;
}

export default function GanttTimeline({ plan, readOnly, onPlanChanged }: Props) {
  const weeks = useMemo(() => getPlanWeeks(plan.period_start, plan.period_end), [plan.period_start, plan.period_end]);
  const months = useMemo(() => getMonthGroups(weeks), [weeks]);
  const weekCount = weeks.length;

  const gridCols = `${INFO_COLS} repeat(${weekCount}, minmax(20px, 1fr))`;

  const cellClass = "border-r border-b border-gray-100 px-1 py-2.5 text-xs flex items-center";
  const stickyClass = "sticky left-0 z-10 bg-white";
  const headerBg = "bg-gray-900 text-white";

  const getSpan = useCallback((startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    return dateRangeToGridSpan(startDate, endDate, weeks);
  }, [weeks]);

  const handleLineUpdate = async (lineId: string, updates: Partial<MediaLine>) => {
    await updateLine(lineId, updates);
    onPlanChanged();
  };

  const handleConceptUpdate = async (conceptId: string, updates: Partial<MediaConcept>) => {
    await updateConcept(conceptId, updates);
    onPlanChanged();
  };

  const handleAddLine = async (categoryId: string) => {
    await createLine(categoryId, plan.period_start, plan.period_end);
    onPlanChanged();
  };

  const handleDeleteLine = async (lineId: string) => {
    await deleteLine(lineId);
    onPlanChanged();
  };

  const handleAddCategory = async () => {
    await createCategory(plan.id, "Ny kategori", plan.categories.length);
    onPlanChanged();
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
    <div className="overflow-x-auto scrollbar-thin px-4 py-2">
      <div
        style={{ display: "grid", gridTemplateColumns: gridCols }}
        className="min-w-max border-l border-t border-gray-100"
      >
        {/* ── Month header row ── */}
        <div
          className={`${cellClass} ${stickyClass} ${headerBg} font-semibold text-sm col-span-${INFO_COL_COUNT}`}
          style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
        >
          {plan.campaign_name}
        </div>
        {months.map((m) => (
          <div
            key={m.label}
            className={`${cellClass} ${headerBg} font-medium justify-center`}
            style={{ gridColumn: `span ${m.spanCols}` }}
          >
            {m.label}
          </div>
        ))}

        {/* ── Column headers (info + week labels) ── */}
        {["Kanal/Plattform", "Pris/enhet", "Enhet", "Antal", "Totalt"].map((h, i) => (
          <div
            key={h}
            className={`${cellClass} ${stickyClass} bg-gray-800 text-gray-300 text-xs font-medium`}
            style={{ left: i === 0 ? 0 : undefined }}
          >
            {h}
          </div>
        ))}
        {weeks.map((w) => (
          <div key={w.index} className={`${cellClass} bg-gray-800 text-gray-400 justify-center`}>
            {w.label}
          </div>
        ))}

        {/* ── Deadline markers row ── */}
        {(plan.deadlines.length > 0 || !readOnly) && (
          <>
            <div
              className={`${cellClass} ${stickyClass} bg-white flex-wrap gap-x-3 gap-y-1`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              {plan.deadlines.map((d) => (
                <div key={d.id} className="flex items-center gap-1 shrink-0">
                  <div style={{ width: 8, height: 8, backgroundColor: d.color, transform: "rotate(45deg)", borderRadius: 1, flexShrink: 0 }} />
                  {readOnly ? (
                    <span className="text-xs font-medium" style={{ color: d.color }}>{d.name} — {d.date}</span>
                  ) : (
                    <>
                      <InlineEdit
                        value={d.name}
                        onSave={(name) => handleUpdateDeadline(d.id, { name })}
                        className="text-xs font-medium"
                        style={{ color: d.color }}
                      />
                      <input
                        type="date"
                        value={d.date}
                        onChange={(e) => handleUpdateDeadline(d.id, { date: e.target.value })}
                        className="text-xs border-0 bg-transparent cursor-pointer"
                        style={{ color: d.color }}
                      />
                      <ColorDot color={d.color} onChange={(color) => handleUpdateDeadline(d.id, { color })} />
                      <button onClick={() => handleDeleteDeadline(d.id)} className="text-red-300 hover:text-red-500 text-xs">×</button>
                    </>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button onClick={handleAddDeadline} className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0">
                  + Deadline
                </button>
              )}
            </div>
            <div style={{ gridColumn: `span ${weekCount}` }} className="relative border-b border-gray-100 bg-white">
              {plan.deadlines.map((d) => {
                const left = getDeadlineLeft(d.date, weeks, weekCount);
                if (left === null) return null;
                return (
                  <div key={d.id} style={{ position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: "2px", backgroundColor: d.color, zIndex: 4 }}>
                    <span style={{ position: "absolute", top: "4px", left: "4px", fontSize: "10px", color: d.color, whiteSpace: "nowrap", fontWeight: 600 }}>
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
              className={`${cellClass} ${stickyClass} bg-gray-50 col-span-${INFO_COL_COUNT}`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              <button
                onClick={handleAddConcept}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                + Lägg till koncept
              </button>
            </div>
            <div style={{ gridColumn: `span ${weekCount}` }} className="bg-gray-50 border-b border-gray-100" />
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
            deadlines={plan.deadlines}
            getSpan={getSpan}
            onLineUpdate={handleLineUpdate}
            onDeleteLine={handleDeleteLine}
            onAddLine={() => handleAddLine(cat.id)}
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
              className={`${cellClass} ${stickyClass} bg-gray-50`}
              style={{ gridColumn: `1 / span ${INFO_COL_COUNT}` }}
            >
              <button
                onClick={handleAddCategory}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                + Lägg till kategori
              </button>
            </div>
            <div style={{ gridColumn: `span ${weekCount}` }} className="bg-gray-50 border-b border-gray-100" />
          </>
        )}

        {/* ── Budget summary row ── */}
        <BudgetSummaryRow plan={plan} infoColCount={INFO_COL_COUNT} weekCount={weekCount} cellClass={cellClass} stickyClass={stickyClass} />
      </div>
    </div>
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
        className={`${cellClass} ${stickyClass} text-xs font-semibold uppercase tracking-wide`}
        style={{ gridColumn: `1 / span ${infoColCount}`, backgroundColor: concept.color + "22", borderLeft: `3px solid ${concept.color}` }}
      >
        {readOnly ? (
          <span style={{ color: concept.color }}>{concept.name}</span>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <ColorDot
              color={concept.color}
              onChange={(color) => onUpdate({ color })}
            />
            <InlineEdit
              value={concept.name}
              onSave={(name) => onUpdate({ name })}
              className="font-semibold text-xs"
              style={{ color: concept.color }}
            />
            <div className="ml-auto flex gap-3">
              <input
                type="date"
                value={concept.start_date}
                onChange={(e) => onUpdate({ start_date: e.target.value })}
                className="text-xs border-0 bg-transparent text-gray-500 cursor-pointer"
              />
              <input
                type="date"
                value={concept.end_date}
                onChange={(e) => onUpdate({ end_date: e.target.value })}
                className="text-xs border-0 bg-transparent text-gray-500 cursor-pointer"
              />
              <button onClick={onDelete} className="text-red-300 hover:text-red-500 text-xs">×</button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline band */}
      <div
        style={{ gridColumn: `span ${weekCount}`, backgroundColor: concept.color + "11" }}
        className="relative border-b border-gray-100 flex items-center"
      >
        {span && (
          <div
            style={{
              position: "absolute",
              left: `${((span.colStart - 1) / weekCount) * 100}%`,
              width: `${((span.colEnd - span.colStart) / weekCount) * 100}%`,
              backgroundColor: concept.color + "55",
              borderLeft: `3px solid ${concept.color}`,
            }}
            className="h-5 rounded-sm flex items-center px-1"
          >
            <span className="text-xs font-medium truncate" style={{ color: concept.color }}>
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
  category, plan, weeks, weekCount, infoColCount, readOnly, deadlines, getSpan,
  onLineUpdate, onDeleteLine, onAddLine, onCategoryUpdate, onDeleteCategory,
  cellClass, stickyClass,
}: {
  category: MediaCategory & { lines: MediaLine[] };
  plan: FullMediaPlan;
  weeks: WeekColumn[];
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
  deadlines: MediaDeadline[];
  getSpan: (s: string | null, e: string | null) => { colStart: number; colEnd: number } | null;
  onLineUpdate: (id: string, updates: Partial<MediaLine>) => void;
  onDeleteLine: (id: string) => void;
  onAddLine: () => void;
  onCategoryUpdate: (updates: Partial<MediaCategory>) => void;
  onDeleteCategory: () => void;
  cellClass: string;
  stickyClass: string;
}) {
  const total = calcCategoryTotal(category.lines);

  return (
    <>
      {/* Category header */}
      <div
        className={`${cellClass} ${stickyClass} font-semibold text-xs`}
        style={{
          gridColumn: `1 / span ${infoColCount}`,
          backgroundColor: category.color + "22",
          borderLeft: `3px solid ${category.color}`,
        }}
      >
        {readOnly ? (
          <span style={{ color: category.color }}>{category.name}</span>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <ColorDot
              color={category.color}
              onChange={(color) => onCategoryUpdate({ color })}
            />
            <InlineEdit
              value={category.name}
              onSave={(name) => onCategoryUpdate({ name })}
              className="font-semibold text-xs"
              style={{ color: category.color }}
            />
            <span className="ml-auto text-xs" style={{ color: category.color, opacity: 0.7 }}>{formatSEK(total)}</span>
            <button onClick={onDeleteCategory} className="text-red-300 hover:text-red-500 text-xs ml-1">×</button>
          </div>
        )}
        {readOnly && <span className="ml-auto text-xs" style={{ color: category.color, opacity: 0.7 }}>{formatSEK(total)}</span>}
      </div>
      <div style={{ gridColumn: `span ${weekCount}`, backgroundColor: category.color + "11" }} className="relative border-b border-gray-100">
        <DeadlineMarkers deadlines={deadlines} weeks={weeks} weekCount={weekCount} />
      </div>

      {/* Media lines */}
      {category.lines.map((line) => (
        <GanttLineRow
          key={line.id}
          line={line}
          plan={plan}
          weeks={weeks}
          weekCount={weekCount}
          infoColCount={infoColCount}
          readOnly={readOnly}
          deadlines={deadlines}
          span={getSpan(line.start_date, line.end_date)}
          onUpdate={(updates) => onLineUpdate(line.id, updates)}
          onDelete={() => onDeleteLine(line.id)}
          cellClass={cellClass}
          stickyClass={stickyClass}
        />
      ))}

      {/* Add line */}
      {!readOnly && (
        <>
          <div
            className={`${cellClass} ${stickyClass} bg-gray-50`}
            style={{ gridColumn: `1 / span ${infoColCount}` }}
          >
            <button
              onClick={onAddLine}
              className="text-xs text-indigo-500 hover:text-indigo-700"
            >
              + Lägg till rad
            </button>
          </div>
          <div style={{ gridColumn: `span ${weekCount}` }} className="bg-gray-50 border-b border-gray-100" />
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
  line, plan, weeks, weekCount, infoColCount, readOnly, deadlines, span, onUpdate, onDelete, cellClass, stickyClass,
}: {
  line: MediaLine;
  plan: FullMediaPlan;
  weeks: WeekColumn[];
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
  deadlines: MediaDeadline[];
  span: { colStart: number; colEnd: number } | null;
  onUpdate: (updates: Partial<MediaLine>) => void;
  onDelete: () => void;
  cellClass: string;
  stickyClass: string;
}) {
  const total = calcLineTotal(line);
  const containerRef = useRef<HTMLDivElement>(null);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const [isDragging, setIsDragging] = useState(false);
  const [displaySpan, setDisplaySpan] = useState(span);
  const displaySpanRef = useRef(span);
  const dragStateRef = useRef<DragState | null>(null);

  // Sync from prop when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDisplaySpan(span);
      displaySpanRef.current = span;
    }
  }, [span, isDragging]);

  const startDrag = useCallback((e: React.MouseEvent, type: DragState["type"]) => {
    if (readOnly || !span) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = { type, startX: e.clientX, startColStart: span.colStart, startColEnd: span.colEnd };
    setIsDragging(true);
  }, [readOnly, span]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
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

    const onMouseUp = () => {
      const finalSpan = displaySpanRef.current;
      if (finalSpan) {
        onUpdateRef.current({
          start_date: colToStartDate(finalSpan.colStart, weeks),
          end_date: colToEndDate(finalSpan.colEnd, weeks),
        });
      }
      dragStateRef.current = null;
      setIsDragging(false);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, weekCount, weeks]);

  return (
    <>
      {/* Platform name */}
      <div className={`${cellClass} ${stickyClass} gap-1.5`}>
        {!readOnly && (
          <ColorDot color={line.color} onChange={(color) => onUpdate({ color })} />
        )}
        {readOnly ? (
          <span className="text-xs">{line.platform_name}</span>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <InlineEdit
              value={line.platform_name}
              onSave={(platform_name) => onUpdate({ platform_name })}
              className="text-xs flex-1 min-w-0"
            />
            <button onClick={onDelete} className="text-red-300 hover:text-red-500 text-xs shrink-0">×</button>
          </div>
        )}
      </div>

      {/* Cost per unit */}
      <div className={`${cellClass} justify-end`}>
        {readOnly ? (
          <span>{line.cost_per_unit?.toLocaleString("sv-SE") ?? "–"}</span>
        ) : (
          <InlineEdit
            value={String(line.cost_per_unit ?? 0)}
            onSave={(v) => onUpdate({ cost_per_unit: Number(v) || 0 })}
            type="number"
            className="text-xs text-right w-full"
          />
        )}
      </div>

      {/* Unit type */}
      <div className={`${cellClass}`}>
        {readOnly ? (
          <span className="truncate">{line.unit_type}</span>
        ) : (
          <select
            value={line.unit_type}
            onChange={(e) => onUpdate({ unit_type: e.target.value })}
            className="text-xs w-full bg-transparent border-0 focus:outline-none cursor-pointer"
          >
            {["per månad", "per vecka", "per sida", "per dagar", "fast pris"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        )}
      </div>

      {/* Quantity */}
      <div className={`${cellClass} justify-center`}>
        {readOnly ? (
          <span>{line.quantity}</span>
        ) : (
          <InlineEdit
            value={String(line.quantity ?? 0)}
            onSave={(v) => onUpdate({ quantity: Number(v) || 0 })}
            type="number"
            className="text-xs text-center w-full"
          />
        )}
      </div>

      {/* Total */}
      <div className={`${cellClass} justify-end text-xs text-gray-600 font-medium`}>
        {formatSEK(total)}
      </div>

      {/* Gantt bar cell */}
      <div
        ref={containerRef}
        style={{ gridColumn: `span ${weekCount}` }}
        className="relative border-b border-gray-100 bg-white"
      >
        <DeadlineMarkers deadlines={deadlines} weeks={weeks} weekCount={weekCount} />
        {displaySpan ? (
          <div
            style={{
              position: "absolute",
              left: `${((displaySpan.colStart - 1) / weekCount) * 100}%`,
              width: `${Math.max(((displaySpan.colEnd - displaySpan.colStart) / weekCount) * 100, 0.5)}%`,
              backgroundColor: line.color,
              top: "15%",
              height: "70%",
              borderRadius: "4px",
              cursor: isDragging ? "grabbing" : (readOnly ? "default" : "grab"),
              userSelect: "none",
            }}
            onMouseDown={!readOnly ? (e) => startDrag(e, "move") : undefined}
            title={`${line.platform_name}: v.${displaySpan.colStart} – v.${displaySpan.colEnd - 1}`}
          >
            {!readOnly && (
              <>
                {/* Left resize handle */}
                <div
                  style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: "8px",
                    cursor: "w-resize",
                    borderRadius: "4px 0 0 4px",
                    backgroundColor: "rgba(0,0,0,0.18)",
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "left"); }}
                />
                {/* Right resize handle */}
                <div
                  style={{
                    position: "absolute",
                    right: 0, top: 0, bottom: 0,
                    width: "8px",
                    cursor: "e-resize",
                    borderRadius: "0 4px 4px 0",
                    backgroundColor: "rgba(0,0,0,0.18)",
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); startDrag(e, "right"); }}
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
                  onChange={(e) => onUpdate({ start_date: e.target.value })}
                  className="border-0 bg-transparent text-xs text-gray-500 cursor-pointer"
                />
                <input
                  type="date"
                  value={line.end_date ?? ""}
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
            style={{ position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: "2px", backgroundColor: d.color, opacity: 0.55, zIndex: 4, pointerEvents: "none" }}
          />
        );
      })}
    </>
  );
}

/* ─── Budget Summary ────────────────────────────────────── */
function BudgetSummaryRow({
  plan, infoColCount, weekCount, cellClass, stickyClass,
}: {
  plan: FullMediaPlan;
  infoColCount: number;
  weekCount: number;
  cellClass: string;
  stickyClass: string;
}) {
  const total = plan.categories.reduce(
    (sum, cat) => sum + calcCategoryTotal(cat.lines),
    0
  );
  const perCategory = plan.categories.map((cat) => ({
    name: cat.name,
    total: calcCategoryTotal(cat.lines),
  }));

  return (
    <>
      <div
        className={`${cellClass} ${stickyClass} bg-gray-900 text-white font-bold`}
        style={{ gridColumn: `1 / span ${infoColCount}` }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-400">Totalt</span>
          <span className="text-sm">{formatSEK(total)}</span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {perCategory.map((c) => (
              <span key={c.name} className="text-xs text-gray-400">
                {c.name}: {formatSEK(c.total)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div
        style={{ gridColumn: `span ${weekCount}` }}
        className="bg-gray-900 border-b border-gray-700"
      />
    </>
  );
}
