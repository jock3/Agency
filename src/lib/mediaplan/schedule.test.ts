import { describe, expect, it } from "vitest";
import { layoutYear, todayFraction } from "./hierarchy";
import { barText, campaignInfo, countFilters, dayLabel, isApproved, matchesFilter, sortCampaigns, todayIso, visibleTags } from "./schedule";
import { campaignColor, clientAccent, fnv1a, initials, projectPattern } from "./pattern";

// Handoffens exempeldata, med dagens datum satt till 17 nov 2026.
const TODAY = "2026-11-17";
const C = [
  { id: "test1", period_start: "2026-01-01", period_end: "2026-02-08", status: "draft" },
  { id: "test2", period_start: "2026-02-01", period_end: "2026-04-30", status: "draft" },
  { id: "test3", period_start: "2026-03-01", period_end: "2026-12-31", status: "active" },
  { id: "julbak", period_start: "2026-11-16", period_end: "2026-12-24", status: "approved" },
];
const by = (id: string) => C.find((c) => c.id === id)!;
const pct = (n: number) => Math.round(n * 10000) / 100;

describe("kampanjernas tider (handoffens tabell)", () => {
  it("Julbak: pågår, 37 dagar kvar, dag 2 av 39, block 87,40 % + 10,68 %", () => {
    const i = campaignInfo(by("julbak"), TODAY);
    expect(i).toMatchObject({ state: "running", left: 37, dayNo: 2, days: 39, approved: true, dates: "16 nov – 24 dec" });
    const b = layoutYear(C, 2026).find((x) => x.item.id === "julbak")!;
    expect(pct(b.start)).toBe(87.4);
    expect(pct(b.end - b.start)).toBe(10.68);
  });
  it("Test 3: pågår, 44 dagar kvar, dag 262 av 306, block 16,16 % + 83,84 %", () => {
    const i = campaignInfo(by("test3"), TODAY);
    expect(i).toMatchObject({ state: "running", left: 44, dayNo: 262, days: 306 });
    const b = layoutYear(C, 2026).find((x) => x.item.id === "test3")!;
    expect(pct(b.start)).toBe(16.16);
    expect(pct(b.end - b.start)).toBe(83.84);
  });
  it("Test1 och Test 2 är avslutade", () => {
    expect(campaignInfo(by("test1"), TODAY)).toMatchObject({ state: "ended", endLabel: "8 feb", days: 39 });
    expect(campaignInfo(by("test2"), TODAY)).toMatchObject({ state: "ended", endLabel: "30 apr", days: 89 });
  });
  it("idag-linjen ligger på 87,81 %", () => expect(pct(todayFraction(2026, TODAY)!)).toBe(87.81));
  it("filterantal: Alla 4, Pågår 2, Avslutade 2, Utkast 3, Godkända 1", () => {
    expect(countFilters(C, TODAY).map((f) => f.n)).toEqual([4, 2, 2, 3, 1]);
    expect(C.filter((c) => matchesFilter(c, "godkanda", TODAY)).map((c) => c.id)).toEqual(["julbak"]);
  });
  it("kortordning: Julbak, Test 3, Test 2, Test1", () => expect(sortCampaigns(C, TODAY).map((c) => c.id)).toEqual(["julbak", "test3", "test2", "test1"]));
  it("kommande kampanj: startar om N dagar, och ordnas efter start", () => {
    const next = { id: "n", period_start: "2026-11-29", period_end: "2026-12-31", status: "draft" };
    expect(campaignInfo(next, TODAY)).toMatchObject({ state: "upcoming", startsIn: 12 });
    expect(sortCampaigns([by("test1"), next, by("julbak")], TODAY).map((c) => c.id)).toEqual(["julbak", "n", "test1"]);
  });
  it("progress är dag X / N", () => expect(campaignInfo(by("julbak"), TODAY).progress).toBeCloseTo((2 / 39) * 100, 5));
  it("godkänd är bara status approved", () => { expect(isApproved({ status: "approved" })).toBe(true); expect(isApproved({ status: "active" })).toBe(false); });
});

describe("datum", () => {
  it("dayLabel", () => { expect(dayLabel("2026-01-01")).toBe("1 jan"); expect(dayLabel("2026-12-24", true)).toBe("24 dec 2026"); });
  it("todayIso räknar svensk tid: 23:30 UTC 16 nov är redan 17 nov i Sverige", () => {
    expect(todayIso(new Date("2026-11-16T23:30:00Z"))).toBe("2026-11-17");
    expect(todayIso(new Date("2026-11-17T12:00:00Z"))).toBe("2026-11-17");
    expect(todayIso(new Date("2026-07-16T22:30:00Z"))).toBe("2026-07-17"); // sommartid
  });
});

describe("text i årsplanen", () => {
  it("lång text ryms inte i ett smalt block och hamnar utanför, åt rätt håll", () => {
    const narrow = barText(60, "Brovik Bageri: Julbak 2026", "16 nov – 24 dec", true, 0.9);
    expect(narrow).toMatchObject({ nameInside: false, outside: true, outsideSide: "left" });
    expect(barText(60, "Test1", "1 jan – 8 feb", false, 0.1)).toMatchObject({ outside: true, outsideSide: "right" });
    expect(barText(900, "Test 3", "1 mar – 31 dec", false, 0.5)).toMatchObject({ nameInside: true, datesInside: true, outside: false });
  });
  it("taggar utan kundens och projektets namn", () => expect(visibleTags(["Region Gotland", "Vattenkampanj", "Sommar"], "region gotland", "Vattenkampanj")).toEqual(["Sommar"]));
});

describe("mönster, färger och initialer", () => {
  it("initialer", () => { expect(initials("Brovik Bageri")).toBe("BB"); expect(initials("PMalmö")).toBe("PM"); expect(initials("Region Gotland")).toBe("RG"); });
  it("mönstret är 16 rutor, samma varje gång, och byts av Blanda mönster", () => {
    const a = projectPattern("abc", 0);
    expect(a).toHaveLength(16);
    expect(projectPattern("abc", 0)).toEqual(a);
    expect(projectPattern("abc", 1)).not.toEqual(a);
    expect(projectPattern("abd", 0)).not.toEqual(a);
  });
  it("förgrund och bakgrund är nästan alltid olika", () => {
    let same = 0, total = 0;
    for (let i = 0; i < 200; i++) for (const c of projectPattern(`p${i}`, i % 4)) { total++; if (c.fg === c.bg && c.shape !== "none") same++; }
    expect(same / total).toBeLessThan(0.01);
  });
  it("FNV-1a stämmer mot känt värde", () => expect(fnv1a("a")).toBe(0xe40c292c));
  it("kundens färg roterar Alcazar, Tintin, Rackham", () => expect([0, 1, 2, 3].map(clientAccent)).toEqual(["alcazar", "tintin", "rackham", "alcazar"]));
  it("kampanjfärgerna roterar", () => expect([0, 1, 2, 3, 6].map(campaignColor)).toEqual(["red", "haddock", "rackham", "tintin", "red"]));
});
