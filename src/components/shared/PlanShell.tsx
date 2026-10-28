"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import TagEditor from "./TagEditor";

/**
 * Gemensamt skal för mediaplanens och kampanjplanens överlägg: ett ljust
 * arbetsfält med planens inställningar, och en rubrikyta som är planens
 * ansikte utåt. Rubrikytan ligger inne i exportens fångstyta, så den kommer
 * med när planen sparas som bild.
 */

export function PlanToolbar({
  kind,
  readOnly,
  periodStart,
  periodEnd,
  onPeriod,
  clientId,
  onClientId,
  tags,
  onTags,
  actions,
  onClose,
}: {
  kind: string;
  readOnly?: boolean;
  periodStart?: string;
  periodEnd?: string;
  onPeriod?: (field: "period_start" | "period_end", value: string) => void;
  clientId?: string | null;
  onClientId?: (value: string) => void;
  tags?: string[];
  onTags?: (tags: string[]) => void;
  actions?: React.ReactNode;
  onClose: () => void;
}) {
  const field = "h-9 px-2.5 text-sm bg-white border border-gray-200 focus:outline-none focus:border-gray-900";

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0">
      <button
        onClick={onClose}
        title="Stäng (Esc)"
        className="h-9 pl-2 pr-3 flex items-center gap-2 text-sm font-bold text-gray-700 border border-gray-200 hover:border-gray-900 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Alla {kind}
      </button>

      {readOnly ? (
        <span className="text-xs font-bold bg-peach text-gray-900 px-2 py-1">Visningsläge</span>
      ) : (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {periodStart && periodEnd && onPeriod && (
            <label className="flex items-center gap-2">
              <span className="text-gray-600">Period</span>
              <input type="date" value={periodStart} onChange={(e) => onPeriod("period_start", e.target.value)} className={field} />
              <span className="text-gray-400" aria-hidden>
                till
              </span>
              <input type="date" value={periodEnd} onChange={(e) => onPeriod("period_end", e.target.value)} className={field} />
            </label>
          )}
          {onClientId && (
            <label className="flex items-center gap-2">
              <span className="text-gray-600">Kund-ID</span>
              <input
                type="text"
                defaultValue={clientId ?? ""}
                onBlur={(e) => onClientId(e.target.value)}
                placeholder="G-001"
                className={`${field} w-24`}
              />
            </label>
          )}
          {tags && onTags && <TagEditor tags={tags} onChange={onTags} />}
        </div>
      )}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ToolbarButton({
  onClick,
  disabled,
  primary,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-4 flex items-center gap-2 text-sm font-bold transition-colors disabled:opacity-50 ${
        primary
          ? "bg-milou-500 text-white hover:bg-milou-600"
          : "bg-white text-gray-800 border border-gray-200 hover:border-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

export interface PlanStat {
  label: string;
  value: string;
}

export function PlanHero({
  name,
  onName,
  period,
  stats,
}: {
  name: string;
  onName?: (name: string) => void;
  period: string;
  stats: PlanStat[];
}) {
  return (
    <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-100 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
      <div className="min-w-0">
        {onName ? (
          <EditableName value={name} onSave={onName} />
        ) : (
          <h1 className="font-display font-extrabold text-3xl leading-tight text-gray-900">{name}</h1>
        )}
        <p className="mt-1 text-gray-600">{period}</p>
      </div>
      <dl className="flex flex-wrap gap-x-10 gap-y-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-sm text-gray-600">{s.label}</dt>
            <dd className="font-display font-extrabold text-2xl text-gray-900 tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Banner när en delningslänk skapats men inte kunde kopieras automatiskt. */
export function ShareLinkBar({ link }: { link: string }) {
  return (
    <div className="bg-beige text-gray-900 text-sm px-6 py-2 flex items-center gap-3">
      <span className="font-bold">Delningslänk</span>
      <code className="truncate">{link}</code>
      <button onClick={() => navigator.clipboard.writeText(link)} className="font-bold underline underline-offset-2">
        Kopiera
      </button>
    </div>
  );
}

function EditableName({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) onSave(draft.trim());
  };

  const type = "font-display font-extrabold text-3xl leading-tight text-gray-900";

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`${type} w-full min-w-[20ch] bg-transparent border-b-2 border-gray-900 focus:outline-none`}
      />
    );
  }

  return (
    <h1>
      <button
        onClick={() => setEditing(true)}
        title="Klicka för att byta namn"
        className={`${type} text-left border-b-2 border-transparent hover:border-dashed hover:border-gray-400 transition-colors`}
      >
        {value}
      </button>
    </h1>
  );
}
