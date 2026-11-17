import { describe, expect, it } from "vitest";
import { hierarchyTags, mergeTags, overlapsYear, planYear, renameTag, rollup } from "./hierarchy";

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
