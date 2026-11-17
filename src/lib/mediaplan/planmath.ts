/**
 * Räkneregler för kampanjens mediaplan (steg 4): inmatade belopp, budgetläge,
 * stapeltexter, idag och slutdag i veckorutnätet. Rena funktioner med tester.
 */
import { format } from "date-fns";
import type { WeekColumn } from "@/lib/utils/dates";
import type { CampaignInfo } from "./schedule";
import { toInput } from "@/lib/report/kpis";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Läser ett belopp som skrivits på svenska eller engelska: "1 234,5", "1234.5", "100 kr".
 * Tomt blir `emptyAs`. Ogiltigt eller negativt blir NaN.
 */
export function parseAmount(raw: string, emptyAs: 0 | null = 0): number | null {
  const t = raw.replace(/[\s  ]/g, "").replace(/kr$/i, "").replace(",", ".");
  if (t === "") return emptyAs;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return NaN;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** Belopp som text i ett fält: "1 234,5", tomt för null. */
export const formatAmount = (n: number | null | undefined): string => (n == null ? "" : toInput(n));

export interface BudgetState {
  hasBudget: boolean;
  /** Kvar (positivt) eller över (negativt). */
  left: number;
  over: boolean;
  /** 0–100, begränsad uppåt för mätaren. */
  meter: number;
  /** "37 %" eller "0,5 %". */
  shareText: string;
}

export function budgetState(booked: number, budget: number | null | undefined): BudgetState {
  const hasBudget = budget != null && budget > 0;
  const share = hasBudget ? (booked / (budget as number)) * 100 : 0;
  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: n < 1 ? 2 : 0 });
  return {
    hasBudget,
    left: hasBudget ? (budget as number) - booked : 0,
    over: hasBudget && booked > (budget as number),
    meter: Math.min(share, 100),
    shareText: `${fmt(share)} %`,
  };
}

/** Initialer på kanalbrickan: första bokstaven, men två om en annan kanal börjar på samma. */
export function monogram(name: string, allNames: readonly string[]): string {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  const same = allNames.filter((n) => (n.trim()[0] ?? "").toUpperCase() === letter).length;
  return same > 1 ? name.trim().slice(0, 2) : letter;
}

const kr = (n: number) => `${Math.round(n).toLocaleString("sv-SE").replace(/[  ]/g, " ")} kr`;

/** Text i en stapel: "v.47–52 · 100 kr", eller "· inget pris" när raden saknar kostnad. */
export function barLabel(fromWeek: number, toWeek: number, cost: number): string {
  return `v.${fromWeek}${toWeek !== fromWeek ? `–${toWeek}` : ""} · ${cost > 0 ? kr(cost) : "inget pris"}`;
}

/** Var idag ligger i veckorutnätet: veckans plats och andel (0–1) av bredden, mitt på dagen. */
export function locateToday(today: string, weeks: WeekColumn[]): { weekIdx: number; frac: number } | null {
  const idx = weeks.findIndex((w) => today >= iso(w.startDate) && today <= iso(w.endDate));
  if (idx === -1) return null;
  const day = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${iso(weeks[idx].startDate)}T12:00:00`).getTime()) / 86400000);
  return { weekIdx: idx, frac: (idx + (Math.min(day, 6) + 0.5) / 7) / weeks.length };
}

/** Där kampanjen slutar i veckorutnätet (0–1), eller null om slutdagen är veckans sista dag i sista kolumnen. */
export function endFraction(periodEnd: string, weeks: WeekColumn[]): number | null {
  const idx = weeks.findIndex((w) => periodEnd >= iso(w.startDate) && periodEnd <= iso(w.endDate));
  if (idx === -1) return null;
  const day = Math.round((new Date(`${periodEnd}T12:00:00`).getTime() - new Date(`${iso(weeks[idx].startDate)}T12:00:00`).getTime()) / 86400000);
  const f = (idx + (day + 1) / 7) / weeks.length;
  return f >= 0.9999 ? null : f;
}

/** Bakgrund för en tidslinjerad: veckolinjer, den här veckan svagt rosa och grått efter kampanjens slut. */
export function laneBackground(weekCount: number, nowWeekIdx: number | null, endFrac: number | null): string {
  const col = 100 / weekCount;
  const layers: string[] = [];
  if (endFrac !== null) layers.push(`linear-gradient(to right, transparent ${(endFrac * 100).toFixed(3)}%, #EDEDED ${(endFrac * 100).toFixed(3)}%)`);
  if (nowWeekIdx !== null) {
    const a = (nowWeekIdx * col).toFixed(3);
    const b = ((nowWeekIdx + 1) * col).toFixed(3);
    layers.push(`linear-gradient(to right, transparent ${a}%, #FFF4EF ${a}%, #FFF4EF ${b}%, transparent ${b}%)`);
  }
  layers.push(`linear-gradient(to right, #E6E6E6 1px, transparent 1px) 0 0 / ${col.toFixed(3)}% 100% repeat-x`);
  return layers.join(", ");
}

/** Rubrikens statusrad: "Pågår · 37 dagar kvar", "Startar om 12 dagar" eller "Avslutad 24 dec". */
export function statusLine(info: Pick<CampaignInfo, "state" | "left" | "startsIn" | "endLabel">): string {
  const dagar = (n: number) => `${n} ${n === 1 ? "dag" : "dagar"}`;
  if (info.state === "running") return `Pågår · ${dagar(info.left)} kvar`;
  if (info.state === "upcoming") return `Startar om ${dagar(info.startsIn)}`;
  return `Avslutad ${info.endLabel}`;
}
