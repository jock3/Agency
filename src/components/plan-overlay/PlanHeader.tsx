"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, ImageDown, Link2 } from "lucide-react";
import ProjectPattern from "@/components/mediaplan/ProjectPattern";
import TagEditor from "@/components/shared/TagEditor";
import CellInput from "./CellInput";
import { budgetState, statusLine } from "@/lib/mediaplan/planmath";
import { campaignInfo } from "@/lib/mediaplan/schedule";
import { formatReach, formatSEK, calcPlanReach, calcPlanTotal } from "@/lib/utils/budget";
import type { FullMediaPlan } from "@/lib/types";

export interface PlanContext {
  client: { id: string; name: string; client_number: string };
  project: { id: string; name: string; pattern_round: number };
}

const STATUS_LABEL = { draft: "Utkast", active: "Aktiv", approved: "Godkänd" } as const;

/** Namnet som rubrik; ett klick gör det redigerbart. */
function EditableTitle({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const type = "font-display font-extrabold leading-[1.04] tracking-[-0.02em] text-4xl min-[761px]:text-[52px]";
  const commit = () => { setEditing(false); if (draft.trim() && draft.trim() !== value) onSave(draft.trim()); else setDraft(value); };
  if (editing) {
    return (
      <input
        autoFocus aria-label="Kampanjens namn" value={draft} maxLength={160}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className={`${type} w-full min-w-[16ch] bg-transparent text-white border-0 border-b-2 border-white rounded-none focus:outline-none`}
      />
    );
  }
  return (
    <h1 id="mp-title" className="m-0">
      <button type="button" onClick={() => setEditing(true)} title="Klicka för att byta namn" className={`${type} text-left bg-transparent text-white border-b-2 border-transparent hover:border-dashed hover:border-[#BDBDBD] cursor-text`}>
        {value}
      </button>
    </h1>
  );
}

/**
 * Planens mörka topp: brödsmulor, namn, status, nyckeltal och budgetmätare.
 * Knappar och flikar har data-html2canvas-ignore, så att bildexporten bara får med själva planen.
 */
export default function PlanHeader({ plan, ctx, today, readOnly, exporting, copyDone, onName, onBudget, onExport, onShare, onClose }: {
  plan: FullMediaPlan;
  ctx: PlanContext | null;
  today: string;
  readOnly?: boolean;
  exporting: boolean;
  copyDone: boolean;
  onName: (name: string) => void;
  onBudget: (budget: number | null) => void;
  onExport: () => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const info = campaignInfo({ period_start: plan.period_start, period_end: plan.period_end, status: plan.status }, today);
  const booked = calcPlanTotal(plan);
  const budget = budgetState(booked, plan.planned_budget);
  const long = (iso: string) => new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T12:00:00`)).replace(/\./g, "");
  const dates = `${long(plan.period_start)} – ${long(plan.period_end)} · ${info.days} dagar`;
  const state = { running: "text-[#FF999C]", upcoming: "text-white", ended: "text-[#BDBDBD]" }[info.state];
  const crumbs = ctx
    ? [{ label: ctx.client.name, href: `/mediaplan/kund/${ctx.client.id}` }, { label: ctx.project.name, href: `/mediaplan/projekt/${ctx.project.id}` }]
    : [{ label: "Osorterade", href: "/mediaplan/osorterade" }];

  return (
    <section aria-labelledby="mp-title" className="bg-gray-900 text-white">
      <div className="max-w-[1280px] mx-auto px-5 min-[761px]:px-10 pt-9">
        <div className="flex items-center justify-between gap-4" data-html2canvas-ignore>
          <nav aria-label="Brödsmulor">
            <ol className="list-none m-0 p-0 flex flex-wrap items-center gap-2.5 text-sm font-semibold">
              <li><Link href="/mediaplan" className="text-[#BDBDBD] no-underline hover:text-white">Kunder</Link></li>
              {crumbs.map((c) => (
                <li key={c.href} className="flex items-center gap-2.5">
                  <ChevronRight aria-hidden className="w-3.5 h-3.5 text-gray-600" />
                  <Link href={c.href} className="text-[#BDBDBD] no-underline hover:text-white">{c.label}</Link>
                </li>
              ))}
              <li className="flex items-center gap-2.5">
                <ChevronRight aria-hidden className="w-3.5 h-3.5 text-gray-600" />
                <span aria-current="page" className="text-white">{plan.campaign_name}</span>
              </li>
            </ol>
          </nav>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-2 min-h-9 px-3 text-sm font-bold text-white border border-gray-600 hover:bg-white hover:text-gray-900 cursor-pointer">
            <ArrowLeft aria-hidden className="w-4 h-4" />Stäng<span className="sr-only"> (Esc)</span>
          </button>
        </div>

        <div className="flex flex-wrap justify-between items-end gap-6 mt-7">
          <div className="flex items-center gap-[22px] min-w-0">
            {ctx && <ProjectPattern projectId={ctx.project.id} round={ctx.project.pattern_round} size={88} className="shrink-0 overflow-hidden max-[760px]:hidden" />}
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-bold tracking-[0.1em] uppercase text-[#FF999C]">Mediaplan</p>
              <div className="mt-1.5">
                {readOnly ? <h1 id="mp-title" className="m-0 font-display font-extrabold leading-[1.04] tracking-[-0.02em] text-4xl min-[761px]:text-[52px]">{plan.campaign_name}</h1> : <EditableTitle value={plan.campaign_name} onSave={onName} />}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 mt-3.5 text-[15px]">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-extrabold ${plan.status === "approved" ? "bg-[#DCF2E5] text-[#145C38]" : plan.status === "active" ? "bg-white text-gray-900" : "border border-dashed border-[#8A8A8A] text-[#D4D4D4]"}`}>
                  {plan.status === "approved" && <Check aria-hidden className="w-3 h-3" strokeWidth={2.4} />}{STATUS_LABEL[plan.status]}
                </span>
                <span className={`inline-flex items-center gap-2 font-extrabold ${state}`}>
                  <span aria-hidden className={`w-2.5 h-2.5 rounded-full ${info.state === "running" ? "bg-[#E60330] mp-pulse" : info.state === "ended" ? "bg-[#AAAAAA]" : "bg-gray-900 border-2 border-white"}`} />
                  {statusLine(info)}
                </span>
                <span className="text-[#D4D4D4]">{dates}</span>
              </div>
            </div>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2.5" data-html2canvas-ignore>
              <button type="button" onClick={onExport} disabled={exporting} className="inline-flex items-center gap-2.5 min-h-[52px] px-5 border border-white bg-transparent text-white hover:bg-white hover:text-gray-900 disabled:opacity-60 text-[15px] font-bold cursor-pointer">
                <ImageDown aria-hidden className="w-4 h-4" strokeWidth={1.8} />{exporting ? "Exporterar…" : "Exportera bild"}
              </button>
              <button type="button" onClick={onShare} className="inline-flex items-center gap-2.5 min-h-[52px] px-[22px] border-0 bg-[#E60330] hover:bg-[#C8022A] text-white text-[15px] font-extrabold cursor-pointer">
                {copyDone ? <Check aria-hidden className="w-4 h-4" strokeWidth={2} /> : <Link2 aria-hidden className="w-4 h-4" strokeWidth={2} />}{copyDone ? "Länken är kopierad" : "Kopiera kundlänk"}
              </button>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 min-[761px]:grid-cols-4 m-0 mt-9 border-t border-[#3A3A3A]">
          <Stat label="Bokat" first>{formatSEK(booked)}</Stat>
          <Stat label="Planerad budget">
            {readOnly ? (plan.planned_budget != null ? formatSEK(plan.planned_budget) : "–") : (
              <CellInput dark value={plan.planned_budget} emptyAs={null} placeholder="Ange" suffix="kr" label="Planerad budget" onCommit={onBudget} className="!h-12 !text-[26px] min-[761px]:!text-[30px] !font-extrabold" />
            )}
          </Stat>
          <Stat label={budget.over ? "Över budget" : "Kvar av budget"}>
            <span className={budget.over ? "text-[#FF999C]" : ""}>{budget.hasBudget ? formatSEK(Math.abs(budget.left)) : "–"}</span>
          </Stat>
          <Stat label="Räckvidd" last>{formatReach(calcPlanReach(plan))}</Stat>
        </dl>
        <div className="pt-1 pb-1.5">
          <div role="img" aria-label={budget.hasBudget ? `Bokat ${budget.shareText} av planerad budget` : "Ingen planerad budget angiven"} className="h-2 bg-[#3A3A3A]">
            <div className="h-2 bg-[#E60330] min-w-[3px]" style={{ width: `${budget.hasBudget ? budget.meter : 0}%`, minWidth: budget.hasBudget ? 3 : 0 }} />
          </div>
          <p className="mt-2 mb-0 text-[13px] text-[#BDBDBD]">{budget.hasBudget ? `${budget.shareText} av den planerade budgeten är bokad` : "Ange en planerad budget för att se hur mycket som är bokat."}</p>
        </div>

        <nav aria-label="Vy" className="flex gap-0.5 mt-[18px]" data-html2canvas-ignore>
          <Link href="/mediaplan" aria-current="page" className="inline-flex items-center px-[22px] py-3.5 text-[15px] font-extrabold no-underline bg-gray-50 text-gray-900">Mediaplaner</Link>
          <Link href="/mediaplan/rapport" className="inline-flex items-center px-[22px] py-3.5 text-[15px] font-semibold no-underline text-white hover:bg-gray-800 hover:text-white">Rapport</Link>
        </nav>
      </div>
    </section>
  );
}

function Stat({ label, children, first, last }: { label: string; children: React.ReactNode; first?: boolean; last?: boolean }) {
  return (
    <div className={`pt-5 pb-[18px] ${first ? "min-[761px]:pr-6" : last ? "min-[761px]:pl-6" : "min-[761px]:px-6"} ${last ? "" : "min-[761px]:border-r min-[761px]:border-[#3A3A3A]"}`}>
      <dt className="text-[13px] font-semibold text-[#BDBDBD]">{label}</dt>
      <dd className="m-0 mt-1.5 text-[26px] min-[761px]:text-[34px] font-extrabold leading-[1.1] whitespace-nowrap">{children}</dd>
    </div>
  );
}

/** Inställningsraden under rubriken: tillbaka, period, kund-ID, status och taggar. */
export function PlanSettings({ plan, backLabel, onClose, onPeriod, onClientId, onStatus, onTags }: {
  plan: FullMediaPlan;
  backLabel: string;
  onClose: () => void;
  onPeriod: (field: "period_start" | "period_end", value: string) => void;
  onClientId: (value: string) => void;
  onStatus: (status: FullMediaPlan["status"]) => void;
  onTags: (tags: string[]) => void;
}) {
  const label = "text-xs font-bold text-gray-600";
  const input = "h-11 px-2.5 border border-[#BDBDBD] bg-white text-sm text-gray-900 rounded-none focus:border-gray-900 focus:outline-none focus:ring-[3px] focus:ring-[#FCBEB7]";
  return (
    <section aria-label="Kampanjinställningar" className="bg-white px-[22px] py-[18px] flex flex-wrap items-end gap-x-7 gap-y-[18px]" data-html2canvas-ignore>
      <button type="button" onClick={onClose} className="inline-flex items-center gap-2 min-h-11 px-3.5 border border-gray-900 bg-white hover:bg-gray-900 hover:text-white text-sm font-bold cursor-pointer">
        <ArrowLeft aria-hidden className="w-4 h-4" strokeWidth={2} />{backLabel}
      </button>
      <div className="flex items-end gap-2.5">
        <div className="flex flex-col gap-1.5"><label htmlFor="period-fran" className={label}>Period från</label><input id="period-fran" type="date" value={plan.period_start} max={plan.period_end} onChange={(e) => e.target.value && onPeriod("period_start", e.target.value)} className={input} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="period-till" className={label}>till</label><input id="period-till" type="date" value={plan.period_end} min={plan.period_start} onChange={(e) => e.target.value && onPeriod("period_end", e.target.value)} className={input} /></div>
      </div>
      <div className="flex flex-col gap-1.5"><label htmlFor="kund-id" className={label}>Kund-ID</label><input id="kund-id" type="text" defaultValue={plan.client_id ?? ""} key={plan.client_id ?? ""} onBlur={(e) => onClientId(e.target.value)} placeholder="G-001" autoComplete="off" className={`${input} w-[110px]`} /></div>
      <div className="flex flex-col gap-1.5"><label htmlFor="plan-status" className={label}>Status</label>
        <select id="plan-status" value={plan.status} onChange={(e) => onStatus(e.target.value as FullMediaPlan["status"])} className={input}>
          <option value="draft">Utkast</option><option value="active">Aktiv</option><option value="approved">Godkänd</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5 flex-[1_1_260px]">
        <span className={label}>Taggar</span>
        <div className="min-h-11 flex items-center"><TagEditor tags={plan.tags ?? []} onChange={onTags} /></div>
      </div>
    </section>
  );
}
