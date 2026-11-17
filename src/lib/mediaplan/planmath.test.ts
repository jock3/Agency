import { describe, expect, it } from "vitest";
import { dateRangeToWeekSpan, getMonthGroups, getPlanWeeks } from "@/lib/utils/dates";
import { barLabel, budgetState, endFraction, formatAmount, laneBackground, locateToday, monogram, parseAmount, statusLine } from "./planmath";
import { campaignInfo } from "./schedule";

// Handoffens exempel: Julbak 16 nov – 24 dec 2026, dagens datum 17 nov (v.47, tisdag), budget 240 000 kr.
const weeks = getPlanWeeks("2026-11-16", "2026-12-24");

describe("veckor", () => {
  it("v.47–52 med datumintervall", () => {
    expect(weeks.map((w) => w.no)).toEqual([47, 48, 49, 50, 51, 52]);
    expect(weeks.map((w) => w.range)).toEqual(["16–22 nov", "23–29 nov", "30 nov–6 dec", "7–13 dec", "14–20 dec", "21–27 dec"]);
  });
  it("en vecka hör till den månad dess torsdag ligger i: november 2 veckor, december 4", () => {
    const m = getMonthGroups(weeks, "thursday");
    expect(m.map((x) => [x.label, x.spanCols])).toEqual([["November 2026", 2], ["December 2026", 4]]);
  });
  it("vecka 49 (30 nov–6 dec) räknas till december, och 28 dec–3 jan (torsdag 31 dec) också, men inte 4–10 jan", () => {
    expect(getMonthGroups(getPlanWeeks("2026-12-28", "2027-01-10"), "thursday").map((m) => [m.label, m.spanCols])).toEqual([["December 2026", 1], ["Januari 2027", 1]]);
  });
});

describe("stapelns veckor", () => {
  it("en rad som slutar mitt i v.52 täcker hela v.52: v.47–52", () => {
    expect(dateRangeToWeekSpan("2026-11-16", "2026-12-24", weeks)).toEqual({ colStart: 1, colEnd: 7 });
  });
  it("slutar på söndag ger samma resultat, och en rad inom en vecka täcker veckan", () => {
    expect(dateRangeToWeekSpan("2026-11-16", "2026-12-27", weeks)).toEqual({ colStart: 1, colEnd: 7 });
    expect(dateRangeToWeekSpan("2026-11-30", "2026-12-02", weeks)).toEqual({ colStart: 3, colEnd: 4 });
  });
  it("TikTok 30 nov – 20 dec är v.49–51", () => expect(dateRangeToWeekSpan("2026-11-30", "2026-12-20", weeks)).toEqual({ colStart: 3, colEnd: 6 }));
});

describe("belopp", () => {
  it("svenska och engelska tal, mellanslag och kr", () => {
    expect(parseAmount("1 234,5")).toBe(1234.5);
    expect(parseAmount("1234.5")).toBe(1234.5);
    expect(parseAmount("100 kr")).toBe(100);
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount("2,")).toBe(2);
  });
  it("tomt blir 0, eller null för räckvidd", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("  ", null)).toBeNull();
  });
  it("ogiltigt och negativt blir NaN", () => {
    for (const s of ["abc", "-5", "1,2,3", "1e3", "12x"]) expect(parseAmount(s)).toBeNaN();
  });
  it("formatAmount ger kommatecken och tusentalsmellanslag", () => {
    expect(formatAmount(1234.5)).toBe("1 234,5");
    expect(formatAmount(100)).toBe("100");
    expect(formatAmount(null)).toBe("");
  });
});

describe("budget", () => {
  it("kvar och andel", () => {
    expect(budgetState(100, 240000)).toMatchObject({ hasBudget: true, left: 239900, over: false });
    expect(budgetState(100, 240000).shareText).toBe("0,04 %");
    expect(budgetState(120000, 240000)).toMatchObject({ meter: 50, shareText: "50 %" });
  });
  it("över budget: negativ rest, mätaren stannar på 100", () => {
    const s = budgetState(300000, 240000);
    expect(s).toMatchObject({ over: true, left: -60000, meter: 100 });
  });
  it("ingen budget satt", () => expect(budgetState(500, null)).toMatchObject({ hasBudget: false, over: false, meter: 0 }));
});

describe("staplar och rubrik", () => {
  it("stapeltext", () => {
    expect(barLabel(47, 52, 100)).toBe("v.47–52 · 100 kr");
    expect(barLabel(49, 49, 0)).toBe("v.49 · inget pris");
    expect(barLabel(47, 50, 12500)).toBe("v.47–50 · 12 500 kr");
  });
  it("kanalbricka: en bokstav, två om två kanaler börjar likadant", () => {
    const names = ["Meta", "TikTok", "Snapchat", "LinkedIn", "Twitch"];
    expect(monogram("Meta", names)).toBe("M");
    expect(monogram("TikTok", names)).toBe("Ti"); // Twitch börjar också på T
    expect(monogram("Twitch", names)).toBe("Tw");
    expect(monogram("Snapchat", names)).toBe("S");
  });
  it("statusrad", () => {
    expect(statusLine(campaignInfo({ period_start: "2026-11-16", period_end: "2026-12-24" }, "2026-11-17"))).toBe("Pågår · 37 dagar kvar");
    expect(statusLine(campaignInfo({ period_start: "2026-11-29", period_end: "2026-12-24" }, "2026-11-17"))).toBe("Startar om 12 dagar");
    expect(statusLine(campaignInfo({ period_start: "2026-01-01", period_end: "2026-02-08" }, "2026-11-17"))).toBe("Avslutad 8 feb");
  });
});

describe("idag och slutdag i veckorutnätet", () => {
  it("idag tisdag v.47 ligger i första veckan, (0 + 1,5/7) / 6", () => {
    const t = locateToday("2026-11-17", weeks)!;
    expect(t.weekIdx).toBe(0);
    expect(t.frac).toBeCloseTo((1.5 / 7) / 6, 6);
  });
  it("idag utanför planen ger null", () => expect(locateToday("2026-10-01", weeks)).toBeNull());
  it("slutdag torsdag 24 dec i v.52 ger (5 + 4/7) / 6", () => expect(endFraction("2026-12-24", weeks)).toBeCloseTo((5 + 4 / 7) / 6, 6));
  it("slutar på veckans sista dag i sista veckan: ingen grå yta", () => expect(endFraction("2026-12-27", getPlanWeeks("2026-11-16", "2026-12-27"))).toBeNull());
  it("tidslinjens bakgrund har veckolinjer, nuvarande vecka och grått efter slut", () => {
    const bg = laneBackground(6, 0, 0.9286);
    expect(bg).toContain("#FFF4EF");
    expect(bg).toContain("#EDEDED");
    expect(bg).toContain("16.667%");
    expect(laneBackground(6, null, null)).not.toContain("#FFF4EF");
  });
});
