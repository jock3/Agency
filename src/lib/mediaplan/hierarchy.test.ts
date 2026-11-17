import { describe, expect, it } from "vitest";
import { daysInYear, hierarchyTags, layoutYear, mergeTags, monthEdges, overlapsYear, planYear, renameTag, rollup, todayFraction } from "./hierarchy";

describe("taggar", () => {
  it("kund, projekt och kampanj, utan tomma och dubbletter", () => {
    expect(hierarchyTags("Region Gotland", "Vattenkampanj")).toEqual(["Region Gotland", "Vattenkampanj"]);
    expect(hierarchyTags("Brovik", "Jul 2026", "Julbak")).toEqual(["Brovik", "Jul 2026", "Julbak"]);
    expect(hierarchyTags("Brovik", "brovik", " ")).toEqual(["Brovik"]);
  });
  it("mergeTags behåller befintliga först", () => expect(mergeTags(["B2C", "gotland"], ["Gotland", "Vatten"])).toEqual(["B2C", "gotland", "Vatten"]));
  it("renameTag byter namn och slår ihop dubbletter", () => {
    expect(renameTag(["Gotland", "B2C"], "gotland", "Region Gotland")).toEqual(["Region Gotland", "B2C"]);
    expect(renameTag(["Gamla", "Nya"], "Gamla", "Nya")).toEqual(["Nya"]);
    expect(renameTag(["A"], "A", " ")).toEqual(["A"]);
  });
});

describe("år och summering", () => {
  const p = (o: Partial<Parameters<typeof rollup>[0][number]>) => ({ kind: "campaign" as const, plan_year: null, period_start: "2026-06-01", period_end: "2026-08-31", planned_budget: 100, archived: false, ...o });
  it("planYear", () => {
    expect(planYear(p({ kind: "year", plan_year: 2027 }))).toBe(2027);
    expect(planYear(p({}))).toBe(2026);
  });
  it("overlapsYear räknar kampanjer över årsskiftet till båda åren", () => {
    const x = p({ period_start: "2026-11-01", period_end: "2027-02-01" });
    expect(overlapsYear(x, 2026)).toBe(true);
    expect(overlapsYear(x, 2027)).toBe(true);
    expect(overlapsYear(x, 2028)).toBe(false);
  });
  it("rollup summerar budget och period, utan arkiverade", () => {
    const r = rollup([p({ kind: "year", planned_budget: 250000 }), p({ planned_budget: null, period_end: "2027-01-10" }), p({ archived: true, planned_budget: 9 })]);
    expect(r).toEqual({ plans: 2, yearPlans: 1, campaigns: 1, plannedBudget: 250000, missingBudget: 1, periodStart: "2026-06-01", periodEnd: "2027-01-10" });
  });
});

describe("årskalender", () => {
  const k = (start: string, end: string) => ({ period_start: start, period_end: end });
  it("hela året fyller 0–1, och slutdagen räknas med", () => {
    const [b] = layoutYear([k("2026-01-01", "2026-12-31")], 2026);
    expect(b.start).toBe(0);
    expect(b.end).toBe(1);
    expect(b.clippedStart || b.clippedEnd).toBe(false);
  });
  it("beskär kampanjer över årsskiftet och markerar det", () => {
    const [a] = layoutYear([k("2026-11-01", "2027-03-01")], 2026);
    expect(a.clippedEnd).toBe(true);
    expect(a.end).toBe(1);
    const [b] = layoutYear([k("2026-11-01", "2027-03-01")], 2027);
    expect(b.clippedStart).toBe(true);
    expect(b.start).toBe(0);
    expect(b.end).toBeCloseTo(60 / 365, 5); // 1 jan–1 mars = 60 dagar
  });
  it("kampanjer utanför året tas inte med", () => expect(layoutYear([k("2025-01-01", "2025-12-31")], 2026)).toEqual([]));
  it("överlappande kampanjer får olika rader, de som följer på varandra delar rad", () => {
    const blocks = layoutYear([k("2026-06-01", "2026-08-31"), k("2026-07-01", "2026-09-30"), k("2026-09-01", "2026-10-31"), k("2026-01-01", "2026-02-28")], 2026);
    const lane = (s: string) => blocks.find((b) => b.item.period_start === s)!.lane;
    expect(lane("2026-01-01")).toBe(0);
    expect(lane("2026-06-01")).toBe(0);
    expect(lane("2026-07-01")).toBe(1);
    expect(lane("2026-09-01")).toBe(0); // första är slut 31/8
  });
  it("en dags kampanj syns", () => {
    const [b] = layoutYear([k("2026-05-05", "2026-05-05")], 2026);
    expect(b.end - b.start).toBeCloseTo(1 / 365, 5);
  });
  it("månadsgränser och skottår", () => {
    const e = monthEdges(2028);
    expect(daysInYear(2028)).toBe(366);
    expect(e).toHaveLength(13);
    expect(e[0]).toBe(0);
    expect(e[12]).toBe(1);
    expect(e[2]).toBeCloseTo(60 / 366, 5);
  });
  it("todayFraction", () => {
    expect(todayFraction(2026, "2026-01-01")).toBeCloseTo(0.5 / 365, 5);
    expect(todayFraction(2026, "2027-01-01")).toBeNull();
  });
});
