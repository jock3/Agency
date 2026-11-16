import { describe, expect, it } from "vitest";
import { budgetByPlatform, insights, largestRemainder, summaryTiles, allRows } from "./summary";
import { effRaw, fmt, kpiValue, neededRaw, parseNum, sortKpis } from "./kpis";
import { SAMPLE_AWARENESS, SAMPLE_BOOKING, SAMPLE_STATS } from "./sample";

/** Förväntade värden ur handoffen, avsnitt 12. */
const nb = (s: string) => s.replace(/ /g, " ");
const row = (stats: typeof SAMPLE_AWARENESS, name: string) => effRaw(stats.platforms.find((p) => p.name === name)!);
const rows = (s: typeof SAMPLE_AWARENESS) => s.platforms.map(effRaw);

describe("Kännedom · Meta (räckvidd 241 000 ifylld på plattformen)", () => {
  const meta = [row(SAMPLE_AWARENESS, "Meta")];
  it("kostnad, frekvens, CPM, CTR, CPC", () => {
    expect(fmt("spend", kpiValue("spend", meta))).toBe(nb("13 500 kr"));
    expect(fmt("frequency", kpiValue("frequency", meta))).toBe("2,69");
    expect(fmt("cpm", kpiValue("cpm", meta))).toBe(nb("20,83 kr"));
    expect(fmt("ctr", kpiValue("ctr", meta))).toBe(nb("0,86 %"));
    expect(fmt("cpc", kpiValue("cpc", meta))).toBe(nb("2,43 kr"));
  });
  it("plattformens eget värde går före summan av annonserna", () => {
    expect(row(SAMPLE_AWARENESS, "Meta").reach).toBe(241000);
  });
});

describe("Övriga rader", () => {
  it("Kännedom · TikTok frekvens och CPM", () => {
    const r = [row(SAMPLE_AWARENESS, "TikTok")];
    expect(fmt("frequency", kpiValue("frequency", r))).toBe("1,89");
    expect(fmt("cpm", kpiValue("cpm", r))).toBe(nb("12,63 kr"));
  });
  it("Kännedom · Snapchat CTR", () => {
    expect(fmt("ctr", kpiValue("ctr", [row(SAMPLE_AWARENESS, "Snapchat")]))).toBe(nb("0,30 %"));
  });
  it("Kännedom · totalt", () => {
    const t = rows(SAMPLE_AWARENESS);
    expect(fmt("reach", kpiValue("reach", t))).toBe(nb("817 000"));
    expect(fmt("frequency", kpiValue("frequency", t))).toBe("2,08");
    expect(fmt("cpm", kpiValue("cpm", t))).toBe(nb("15,92 kr"));
    expect(fmt("ctr", kpiValue("ctr", t))).toBe(nb("0,63 %"));
  });
  it("Bokning · Meta (summa av två annonser)", () => {
    const r = [row(SAMPLE_BOOKING, "Meta")];
    expect(fmt("spend", kpiValue("spend", r))).toBe(nb("16 500 kr"));
    expect(fmt("cpa", kpiValue("cpa", r))).toBe(nb("43,42 kr"));
  });
  it("Bokning · totalt", () => {
    const t = rows(SAMPLE_BOOKING);
    expect(fmt("ctr", kpiValue("ctr", t))).toBe(nb("2,27 %"));
    expect(fmt("cpc", kpiValue("cpc", t))).toBe(nb("2,25 kr"));
    expect(fmt("cpa", kpiValue("cpa", t))).toBe(nb("43,74 kr"));
  });
});

describe("Sammanfattning · totalt (matchad täckning)", () => {
  const all = allRows(SAMPLE_STATS);
  it("summor och kvoter", () => {
    expect(fmt("spend", kpiValue("spend", all))).toBe(nb("60 200 kr"));
    expect(fmt("impressions", kpiValue("impressions", all))).toBe(nb("2 345 000"));
    expect(fmt("clicks", kpiValue("clicks", all))).toBe(nb("25 470"));
    expect(fmt("ctr", kpiValue("ctr", all))).toBe(nb("1,09 %"));
    expect(fmt("cpc", kpiValue("cpc", all))).toBe(nb("2,36 kr"));
    expect(fmt("conversions", kpiValue("conversions", all))).toBe("759");
  });
  it("CPA räknas bara på rader med konverteringar: 43,74 kr, inte 79,31 kr", () => {
    expect(fmt("cpa", kpiValue("cpa", all))).toBe(nb("43,74 kr"));
  });
  it("nyckeltalsrutorna är de fyra första med data", () => {
    expect(summaryTiles(SAMPLE_STATS).map((t) => t.key)).toEqual(["spend", "impressions", "clicks", "conversions"]);
  });
});

describe("Budget per plattform", () => {
  it("Meta 50 %, TikTok 23 %, Google Ads 21 %, Snapchat 6 % (summan blir 100, inte 101)", () => {
    const b = budgetByPlatform(SAMPLE_STATS);
    expect(b.map((e) => [e.name, e.value, e.share])).toEqual([
      ["Meta", 30000, 50],
      ["TikTok", 13700, 23],
      ["Google Ads", 12500, 21],
      ["Snapchat", 4000, 6],
    ]);
    expect(b.reduce((a, e) => a + e.share, 0)).toBe(100);
  });
  it("största rest: tre lika delar blir 34 + 33 + 33", () => {
    expect(largestRemainder([100 / 3, 100 / 3, 100 / 3])).toEqual([34, 33, 33]);
    expect(largestRemainder([50, 50])).toEqual([50, 50]);
  });
  it("slår ihop plattformsnamn oavsett versaler", () => {
    const b = budgetByPlatform([{ title: "x", platforms: [{ id: "1", name: "Meta", values: { spend: 100 }, ads: [] }, { id: "2", name: " meta ", values: { spend: 50 }, ads: [] }] }]);
    expect(b).toHaveLength(1);
    expect(b[0].value).toBe(150);
  });
});

describe("Höjdpunkter", () => {
  it("fyra punkter i rätt ordning", () => {
    const i = insights(SAMPLE_STATS).map((x) => `${x.name} ${x.text}`);
    expect(i).toEqual([
      `TikTok hade lägst CPM bland sociala kanaler i Kännedomskampanj: ${nb("12,63 kr")}`,
      `Meta hade högst CTR bland sociala kanaler i Bokningskampanj: ${nb("2,17 %")}`,
      `Google Ads hade lägst kostnad per konvertering i Bokningskampanj: ${nb("36,66 kr")}`,
      `Meta stod för störst del av budgeten: 50 %`,
    ]);
  });
  it("Google Ads jämförs inte med sociala kanaler på CTR (handoffens backlogg punkt 3)", () => {
    expect(insights(SAMPLE_STATS).some((x) => x.name === "Google Ads" && x.text.includes("CTR"))).toBe(false);
  });
  it("sökkanaler jämförs med varandra, och utan blandning står det ingen grupp", () => {
    const p = (id: string, name: string, clicks: number) => ({ id, name, values: { spend: 100, impressions: 1000, clicks }, ads: [] });
    const onlySearch = insights([{ title: "x", platforms: [p("1", "Google Ads", 50), p("2", "Microsoft Ads", 80)] }]);
    expect(onlySearch.find((x) => x.text.includes("CTR"))).toMatchObject({ name: "Microsoft Ads", text: expect.stringMatching(/^hade högst CTR: /) });
    const onlySocial = insights([{ title: "x", platforms: [p("1", "Meta", 5), p("2", "TikTok", 8)] }]);
    expect(onlySocial.find((x) => x.text.includes("CTR"))!.text.startsWith("hade högst CTR:")).toBe(true);
  });
  it("kräver minst två rader att jämföra", () => {
    expect(insights([{ title: "x", platforms: [{ id: "1", name: "Meta", values: { spend: 1, impressions: 1000, clicks: 10 }, ads: [] }] }])).toEqual([]);
  });
});

describe("Regler", () => {
  it("saknad data och division med noll ger null och visas som –", () => {
    expect(kpiValue("ctr", [{ clicks: 5 }])).toBeNull();
    expect(kpiValue("ctr", [{ clicks: 5, impressions: 0 }])).toBeNull();
    expect(fmt("ctr", null)).toBe("–");
  });
  it("bara nödvändig rådata efterfrågas", () => {
    expect(neededRaw(["ctr"])).toEqual(["impressions", "clicks"]);
  });
  it("kolumner sorteras i bibliotekets ordning", () => {
    expect(sortKpis(["cpa", "spend", "ctr"])).toEqual(["spend", "ctr", "cpa"]);
  });
  it("svenska skrivsätt godtas", () => {
    expect(parseNum("412 000")).toBe(412000);
    expect(parseNum("2,5")).toBe(2.5);
    expect(parseNum("8 200 kr")).toBe(8200);
    expect(parseNum("")).toBeNull();
    expect(parseNum("abc")).toBeNaN();
  });
});
