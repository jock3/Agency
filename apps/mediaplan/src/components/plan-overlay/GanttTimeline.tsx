"use client";

import { useMemo, useState, useCallback } from "react";
import type { FullMediaPlan, MediaLine, MediaConcept, MediaCategory } from "@/lib/types";
import { getPlanWeeks, getMonthGroups, dateRangeToGridSpan } from "@/lib/utils/dates";
import { calcLineTotal, calcCategoryTotal, formatSEK } from "@/lib/utils/budget";
import { updateLine, createLine, deleteLine } from "@/lib/api/lines";
import { updateCategory, createCategory, deleteCategory } from "@/lib/api/categories";
import { updateConcept, createConcept, deleteConcept } from "@/lib/api/concepts";
import InlineEdit from "./InlineEdit";
import ColorDot from "./ColorDot";

const INFO_COLS = "200px 80px 90px 60px 100px";
const INFO_COL_COUNT = 5;

interface Props {
  plan: FullMediaPlan;
  readOnly?: boolean;
  onPlanChanged: () => void;
}

export default function GanttTimeline({ plan, readOnly, onPlanChanged }: Props) {
  const weeks = useMemo(() => getPlanWeeks(plan.period_start, plan.period_end), [plan.period_start, plan.period_end]);
  const months = useMemo(() => getMonthGroups(weeks), [weeks]);
  const weekCount = weeks.length;

  const gridCols = `${INFO_COLS} repeat(${weekCount}, minmax(28px, 1fr))`;

  const cellClass = "border-r border-b border-gray-100 px-1 py-1 text-xs flex items-center";
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
    await createCategory(plan.id, "Ny kategori");
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

  return (
    <div className="overflow-x-auto scrollbar-thin">
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

        {/* ── Concept bands ── */}
        {plan.concepts.map((concept) => {
          const span = getSpan(concept.start_date, concept.end_date);
          return (
            <GanttConceptRow
              key={concept.id}
              concept={concept}
              span={span}
              weekCount={weekCount}
              infoColCount={INFO_COL_COUNT}
              readOnly={readOnly}
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
            weekCount={weekCount}
            infoColCount={INFO_COL_COUNT}
            readOnly={readOnly}
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
  concept, span, weekCount, infoColCount, readOnly, onUpdate, onDelete, cellClass, stickyClass,
}: {
  concept: MediaConcept;
  span: { colStart: number; colEnd: number } | null;
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
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
      </div>
    </>
  );
}

/* ─── Category Section ──────────────────────────────────── */
function GanttCategorySection({
  category, plan, weekCount, infoColCount, readOnly, getSpan,
  onLineUpdate, onDeleteLine, onAddLine, onCategoryUpdate, onDeleteCategory,
  cellClass, stickyClass,
}: {
  category: MediaCategory & { lines: MediaLine[] };
  plan: FullMediaPlan;
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
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
        className={`${cellClass} ${stickyClass} bg-gray-800 text-white font-semibold text-xs`}
        style={{ gridColumn: `1 / span ${infoColCount}` }}
      >
        {readOnly ? (
          <span>{category.name}</span>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <InlineEdit
              value={category.name}
              onSave={(name) => onCategoryUpdate({ name })}
              className="font-semibold text-white"
              darkMode
            />
            <span className="ml-auto text-gray-400 text-xs">{formatSEK(total)}</span>
            <button onClick={onDeleteCategory} className="text-red-300 hover:text-red-500 text-xs ml-1">×</button>
          </div>
        )}
        {readOnly && <span className="ml-auto text-gray-400 text-xs">{formatSEK(total)}</span>}
      </div>
      <div style={{ gridColumn: `span ${weekCount}` }} className="bg-gray-800 border-b border-gray-700" />

      {/* Media lines */}
      {category.lines.map((line) => (
        <GanttLineRow
          key={line.id}
          line={line}
          plan={plan}
          weekCount={weekCount}
          infoColCount={infoColCount}
          readOnly={readOnly}
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
function GanttLineRow({
  line, plan, weekCount, infoColCount, readOnly, span, onUpdate, onDelete, cellClass, stickyClass,
}: {
  line: MediaLine;
  plan: FullMediaPlan;
  weekCount: number;
  infoColCount: number;
  readOnly?: boolean;
  span: { colStart: number; colEnd: number } | null;
  onUpdate: (updates: Partial<MediaLine>) => void;
  onDelete: () => void;
  cellClass: string;
  stickyClass: string;
}) {
  const total = calcLineTotal(line);

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
        style={{ gridColumn: `span ${weekCount}` }}
        className="relative border-b border-gray-100 bg-white"
      >
        {!readOnly && (
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            <div className="flex gap-1 px-1 text-xs text-gray-300">
              <input
                type="date"
                value={line.start_date ?? ""}
                onChange={(e) => onUpdate({ start_date: e.target.value })}
                className="border-0 bg-transparent text-xs w-26 text-gray-400 cursor-pointer"
              />
              <input
                type="date"
                value={line.end_date ?? ""}
                onChange={(e) => onUpdate({ end_date: e.target.value })}
                className="border-0 bg-transparent text-xs w-26 text-gray-400 cursor-pointer"
              />
            </div>
          </div>
        )}

        {span && (
          <div
            style={{
              position: "absolute",
              left: `${((span.colStart - 1) / weekCount) * 100}%`,
              width: `${Math.max(((span.colEnd - span.colStart) / weekCount) * 100, 1)}%`,
              backgroundColor: line.color,
              top: "25%",
              height: "50%",
              borderRadius: "3px",
            }}
            title={`${line.platform_name}: ${line.start_date} → ${line.end_date}`}
          />
        )}
      </div>
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
