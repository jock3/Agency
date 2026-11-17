"use client";

import { layoutYear, monthEdges, todayFraction } from "@/lib/mediaplan/hierarchy";
import type { MediaPlan } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
// Blockfärger med text som går att läsa mot dem.
const COLORS = [
  { bg: "#e60330", fg: "#ffffff" },
  { bg: "#1f1f1f", fg: "#ffffff" },
  { bg: "#ff9aa0", fg: "#1f1f1f" },
  { bg: "#ffd9c9", fg: "#1f1f1f" },
  { bg: "#5b2a45", fg: "#ffffff" },
  { bg: "#c9c9c9", fg: "#1f1f1f" },
];
const LANE_H = 38;
const date = (iso: string) => { const [, m, d] = iso.split("-"); return `${Number(d)}/${Number(m)}`; };

/**
 * Årsplanen som kalender: tolv månader och ett block per kampanj över dess
 * period. Kampanjer som överlappar ligger på olika rader. Klick på ett block
 * öppnar kampanjens plan.
 */
export default function YearCalendar({ year, campaigns, onOpen, today }: { year: number; campaigns: MediaPlan[]; onOpen: (id: string) => void; today?: string }) {
  const blocks = layoutYear(campaigns, year);
  const edges = monthEdges(year);
  const lanes = Math.max(1, ...blocks.map((b) => b.lane + 1));
  const now = todayFraction(year, today ?? new Date().toISOString().slice(0, 10));
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

  return (
    <div className="overflow-x-auto bg-white" role="group" aria-label={`Årskalender ${year}`}>
      <div className="min-w-[900px] px-4 pb-4">
        <div className="relative h-8 border-b border-gray-200" aria-hidden>
          {MONTHS.map((m, i) => (
            <span key={m} className="absolute top-0 h-8 flex items-center pl-2 text-xs font-bold text-gray-600" style={{ left: pct(edges[i]), width: pct(edges[i + 1] - edges[i]) }}>
              {m}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height: lanes * LANE_H + 16 }}>
          {edges.slice(1, 12).map((e, i) => <span key={i} aria-hidden className="absolute top-0 bottom-0 w-px bg-gray-200" style={{ left: pct(e) }} />)}
          {now !== null && <span aria-hidden title="Idag" className="absolute top-0 bottom-0 w-0.5 bg-milou-500" style={{ left: pct(now) }} />}
          {blocks.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-gray-500">Inga kampanjer {year} än. Nya kampanjer dyker upp här som block.</p>}
          {blocks.map((b, i) => {
            const c = COLORS[i % COLORS.length];
            const p = b.item;
            const label = `${p.campaign_name}, ${date(p.period_start)}–${date(p.period_end)}${b.clippedStart || b.clippedEnd ? " (pågår över årsskiftet)" : ""}`;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpen(p.id)}
                title={label}
                aria-label={label}
                className="absolute h-8 px-2 text-left text-xs font-bold overflow-hidden whitespace-nowrap text-ellipsis hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-900"
                style={{
                  left: pct(b.start),
                  width: pct(b.end - b.start),
                  minWidth: 6,
                  top: 8 + b.lane * LANE_H,
                  background: c.bg,
                  color: c.fg,
                  borderTopLeftRadius: b.clippedStart ? 0 : 3,
                  borderBottomLeftRadius: b.clippedStart ? 0 : 3,
                  borderTopRightRadius: b.clippedEnd ? 0 : 3,
                  borderBottomRightRadius: b.clippedEnd ? 0 : 3,
                }}
              >
                {b.clippedStart && "◂ "}{p.campaign_name}{b.clippedEnd && " ▸"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
