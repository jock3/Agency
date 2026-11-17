"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { daysInYear, layoutYear, monthEdges, todayFraction } from "@/lib/mediaplan/hierarchy";
import { HEX, isDarkColor, type ColorName } from "@/lib/mediaplan/pattern";
import { barText, campaignInfo, dayLabel } from "@/lib/mediaplan/schedule";
import type { MediaPlan } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const LANE = 52;
const BAR = 38;
const TOP = 36;

const pct = (n: number) => `${Math.round(n * 100000) / 1000}%`;

/**
 * Årsplanen som kalender: en bana per kampanj i ordning efter start, block över
 * kampanjens period. Utkast har diagonala ränder, godkända är helfärgade med bock.
 * Hover eller fokus på ett block eller ett kort tonar ner de andra.
 */
export default function YearPlan({ year, plans, colors, today, hot, onHot, visible, onOpen }: {
  year: number;
  plans: MediaPlan[];
  colors: Record<string, ColorName>;
  today: string;
  hot: string | null;
  onHot: (id: string | null) => void;
  /** Id:n som matchar valt filter. Övriga tonas ner. */
  visible: Set<string>;
  onOpen: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1150);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width || 1150);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width || 1150));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const blocks = layoutYear(plans, year);
  const edges = monthEdges(year);
  const total = daysInYear(year);
  const monthDays = edges.slice(1).map((e, i) => Math.round((e - edges[i]) * total));
  const quarters = [0, 1, 2, 3].map((q) => monthDays.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0));
  const nowFrac = todayFraction(year, today);
  const nowMonth = nowFrac !== null ? Number(today.slice(5, 7)) - 1 : -1;
  const cols = monthDays.map((d) => `${d}fr`).join(" ");
  const height = TOP + Math.max(1, blocks.length) * LANE + 8;

  return (
    <div className="mt-5 bg-white px-4 min-[761px]:px-6 pt-5 pb-[18px] overflow-x-auto">
      <div ref={ref} className="min-w-[860px]">
        <div className="grid text-[11px] font-bold tracking-[0.1em] uppercase text-gray-600" style={{ gridTemplateColumns: quarters.map((d) => `${d}fr`).join(" ") }}>
          {quarters.map((_, i) => <span key={i} className="pl-2 pb-1.5 border-l-2 border-gray-900">Kvartal {i + 1}</span>)}
        </div>
        <div className="grid border-b border-gray-900" style={{ gridTemplateColumns: cols }}>
          {MONTHS.map((m, i) => <span key={m} className={`py-2 pl-2 text-[13px] ${i === nowMonth ? "text-[#C8022A] font-extrabold" : "font-bold text-gray-900"}`}>{m}</span>)}
        </div>
        <div className="relative" style={{ height }}>
          <div aria-hidden className="absolute inset-0 grid" style={{ gridTemplateColumns: cols }}>
            {MONTHS.map((m, i) => <span key={m} className={`border-l border-[#EDEDED] ${i === nowMonth ? "bg-[#FFF4EF]" : ""}`} />)}
          </div>
          {blocks.length === 0 && <p className="absolute inset-x-0 top-[44px] text-center text-sm text-gray-600 m-0">Inga kampanjer {year} än. Nya kampanjer dyker upp här som block.</p>}

          {blocks.map((b) => {
            const p = b.item;
            const color = colors[p.id] ?? "red";
            const info = campaignInfo(p, today);
            const w = (b.end - b.start) * width;
            const t = barText(w, p.campaign_name, info.dates, info.approved, (b.start + b.end) / 2);
            const top = TOP + b.lane * LANE;
            const dim = (hot && hot !== p.id) || !visible.has(p.id);
            const faded = !visible.has(p.id);
            return (
              <div key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  onMouseEnter={() => onHot(p.id)}
                  onMouseLeave={() => onHot(null)}
                  onFocus={() => onHot(p.id)}
                  onBlur={() => onHot(null)}
                  aria-label={`${p.campaign_name}, ${info.dates}, ${info.approved ? "godkänd" : "utkast"}. Öppna kampanjens plan`}
                  className={`absolute z-[1] border-0 p-0 text-left cursor-pointer transition-[opacity,transform,box-shadow] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1C1C1C] motion-reduce:hover:transform-none ${info.approved ? "" : "mp-draft"} ${color === "haddock" ? "mp-on-dark" : ""}`}
                  style={{ top, height: BAR, left: pct(b.start), width: pct(b.end - b.start), minWidth: 6, background: HEX[color], color: isDarkColor(color) ? "#FFFFFF" : "#1C1C1C", opacity: faded ? 0.18 : dim ? 0.28 : 1 }}
                >
                  <span className="flex items-center gap-2 h-full px-3 whitespace-nowrap overflow-hidden">
                    {info.approved && <Check aria-hidden className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />}
                    {t.nameInside && <span className="text-[13px] font-extrabold">{p.campaign_name}</span>}
                    {t.datesInside && <span className="text-xs font-medium opacity-85">{info.dates}</span>}
                  </span>
                </button>
                {t.outside && (
                  <span
                    aria-hidden
                    className={`absolute flex flex-col justify-center whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none ${t.outsideSide === "left" ? "items-end text-right" : "items-start text-left"}`}
                    style={{ top, height: BAR, opacity: faded ? 0.18 : dim ? 0.28 : 1, ...(t.outsideSide === "left" ? { right: `calc(${pct(1 - b.start)} + 10px)` } : { left: `calc(${pct(b.end)} + 10px)` }) }}
                  >
                    <span className="text-[13px] font-extrabold">{p.campaign_name}</span>
                    <span className="text-xs text-gray-600">{info.dates}</span>
                  </span>
                )}
              </div>
            );
          })}

          {nowFrac !== null && (
            <>
              <div aria-hidden className="absolute top-0 bottom-0 w-0.5 bg-[#E60330] z-[2]" style={{ left: pct(nowFrac) }} />
              <span className="absolute top-2 -translate-x-1/2 px-2 py-[3px] bg-[#E60330] text-white text-[11px] font-extrabold whitespace-nowrap z-[3]" style={{ left: pct(nowFrac) }}>Idag {dayLabel(today)}</span>
            </>
          )}
        </div>
      </div>
      <ul aria-label="Förklaring" className="list-none m-0 mt-4 pt-3.5 border-t border-[#EDEDED] flex flex-wrap gap-x-[22px] gap-y-2 text-[13px] text-[#3D3D3D] p-0">
        <li className="flex items-center gap-2"><span aria-hidden className="mp-draft w-7 h-3.5 bg-[#FCBEB7]" />Randig = utkast</li>
        <li className="flex items-center gap-2"><span aria-hidden className="w-7 h-3.5 bg-[#FCBEB7] grid place-items-center"><Check className="w-2.5 h-2.5" strokeWidth={3} /></span>Helfärgad med bock = godkänd</li>
        <li className="flex items-center gap-2"><span aria-hidden className="w-0.5 h-4 bg-[#E60330]" />Röd linje = idag</li>
      </ul>
    </div>
  );
}
