"use client";

import { ArrowRight, Check, FileText } from "lucide-react";
import PlateCard from "./PlateCard";
import { HEX, type ColorName } from "@/lib/mediaplan/pattern";
import { campaignInfo, dayLabel } from "@/lib/mediaplan/schedule";
import type { MediaPlan } from "@/lib/types";

const mini = "border-0 bg-transparent p-0 py-1 text-xs font-semibold text-gray-600 hover:underline cursor-pointer";

/** Kampanjkort: läge, status, nedräkning, taggar, rapportknapp och knapp till planen. */
export default function CampaignCard({ plan, color, today, tags, dim, onHot, onOpen, onArchive, onDelete, report }: {
  plan: MediaPlan;
  color: ColorName;
  today: string;
  tags: string[];
  /** En annan kampanj är markerad: tona ner det här kortet. */
  dim: boolean;
  onHot: (on: boolean) => void;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  report: { reportReady: boolean; reportId: string | null; reportBusy: boolean; onReport: () => void };
}) {
  const info = campaignInfo(plan, today);
  const archived = plan.archived;
  const state = { running: ["Pågår", "text-[#C8022A]"], ended: ["Avslutad", "text-gray-600"], upcoming: ["Kommande", "text-gray-900"] }[info.state];
  // Det finns inget att rapportera innan kampanjen har startat, om det inte redan finns en rapport.
  const tooEarly = info.state === "upcoming" && !report.reportId;
  const label = !report.reportReady ? "Rapport" : report.reportBusy ? "Skapar…" : report.reportId ? "Se rapport" : "Skapa rapport";
  const helpId = `rapport-hjalp-${plan.id}`;

  return (
    <PlateCard
      color={HEX[color]}
      cardClassName="p-[22px] pb-[18px] flex flex-col gap-4"
      className={`transition-opacity duration-200 motion-reduce:transition-none ${dim ? "opacity-40" : ""}`}
      onMouseEnter={() => onHot(true)}
      onMouseLeave={() => onHot(false)}
      onFocus={() => onHot(true)}
      onBlur={() => onHot(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-2 text-[13px] font-extrabold ${state[1]}`}>
          <span aria-hidden className={`w-2.5 h-2.5 rounded-full ${info.state === "running" ? "bg-[#E60330] mp-pulse" : info.state === "ended" ? "bg-[#AAAAAA]" : "bg-white border-2 border-gray-900"}`} />
          {state[0]}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-[9px] py-1 text-xs font-bold ${info.approved ? "border border-[#BFE5CF] text-[#145C38] bg-[#DCF2E5]" : "border border-dashed border-[#8A8A8A] text-[#3D3D3D] bg-white"}`}>
          {info.approved && <Check aria-hidden className="w-3 h-3" strokeWidth={2.4} />}{info.approved ? "Godkänd" : "Utkast"}
        </span>
      </div>
      <div>
        <h3 className="m-0 text-[22px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words">{plan.campaign_name}</h3>
        <p className="mt-1.5 mb-0 text-sm text-[#3D3D3D]">{info.dates} · {info.days} dagar</p>
      </div>

      {info.state === "running" && (
        <div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-xl font-extrabold whitespace-nowrap">{info.left} {info.left === 1 ? "dag" : "dagar"} kvar</span>
            <span className="text-xs text-gray-600 whitespace-nowrap">Dag {info.dayNo} av {info.days}</span>
          </div>
          <div role="progressbar" aria-label="Hur långt kampanjen har kommit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(info.progress)} className="h-2 mt-2 bg-gray-50">
            <div className="h-2 bg-[#E60330]" style={{ width: `${Math.round(info.progress * 1000) / 1000}%` }} />
          </div>
        </div>
      )}
      {info.state === "ended" && <p className="m-0 px-3 py-2.5 bg-gray-50 text-sm font-semibold text-[#3D3D3D]">Avslutades {info.endLabel}</p>}
      {info.state === "upcoming" && <p className="m-0 px-3 py-2.5 bg-[#FFDED0] text-sm font-bold">Startar om {info.startsIn} {info.startsIn === 1 ? "dag" : "dagar"}</p>}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="px-2 py-[3px] bg-[#FFDED0] text-[#931644] text-xs font-bold">{t}</span>)}</div>
      )}

      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={report.onReport}
          disabled={!report.reportReady || report.reportBusy || tooEarly}
          aria-describedby={tooEarly ? helpId : undefined}
          className="flex-auto inline-flex items-center justify-center gap-2 min-h-[46px] px-3.5 border-0 bg-[#E60330] hover:bg-[#C8022A] disabled:bg-[#E6E6E6] disabled:text-gray-600 disabled:cursor-not-allowed text-white text-[15px] font-extrabold cursor-pointer"
        >
          <FileText aria-hidden className="w-4 h-4" strokeWidth={1.8} />{label}
        </button>
        <button type="button" onClick={onOpen} aria-label={`Öppna planen för ${plan.campaign_name}`} title="Öppna kampanjens plan" className="w-[46px] h-[46px] grid place-items-center border-0 bg-gray-900 hover:bg-gray-800 text-white shrink-0 cursor-pointer">
          <ArrowRight aria-hidden className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>
      </div>
      {tooEarly && <p id={helpId} className="m-0 -mt-2 text-xs text-gray-600">Rapport kan skapas när kampanjen har startat ({info.startLabel}).</p>}

      <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
        <span>Skapad {dayLabel(plan.created_at.slice(0, 10))}</span>
        <span className="flex gap-2.5">
          <button type="button" onClick={onArchive} className={mini}>{archived ? "Återställ" : "Arkivera"}</button>
          <button type="button" onClick={onDelete} className={`${mini} !font-bold !text-[#C8022A]`}>Ta bort</button>
        </span>
      </div>
    </PlateCard>
  );
}
