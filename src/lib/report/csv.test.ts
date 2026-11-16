import { describe, expect, it } from "vitest";
import { buildPlatform, decodeFile, guessMapping, guessPlatform, parseCell, parseCsv } from "./csv";

let n = 0;
const id = () => `id${++n}`;
const col = (headers: string[], i: number | null) => (i === null ? null : headers[i]);

describe("tal i celler", () => {
  it.each([
    ["412 000", 412000], ["1,234.56", 1234.56], ["1.234,56", 1234.56], ["2,5", 2.5], ["8 200 kr", 8200], ["SEK 1,200", 1200],
    ["0.86%", 0.86], ["1.234.567", 1234567], ["12,345", 12345], ["--", null], ["-", null], ["", null], ["abc", null], ["13 500,00", 13500],
  ])("%s → %s", (cell, want) => expect(parseCell(cell)).toBe(want));
});

describe("filer", () => {
  it("UTF-16 med BOM (LinkedIn, Google Ads) avkodas", () => {
    const text = "a\tb\n1\t2";
    const bytes = new Uint8Array([0xff, 0xfe, ...Array.from(text).flatMap((c) => [c.charCodeAt(0), 0])]);
    expect(decodeFile(bytes)).toBe(text);
  });
  it("UTF-8 med BOM", () => {
    expect(decodeFile(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe("a");
  });
  it("semikolon, citattecken med avgränsare inuti och radbrytning", () => {
    const t = parseCsv('Annonsnamn;Visningar\n"Video; 15 s";"1 200"\n"Två\nrader";5')!;
    expect(t.delimiter).toBe(";");
    expect(t.rows).toEqual([["Video; 15 s", "1 200"], ["Två\nrader", "5"]]);
  });
  it("rader med rapportnamn och datum före rubrikraden hoppas över (Google Ads)", () => {
    const t = parseCsv("Ad report\n1 June 2026 - 31 August 2026\nCampaign,Ad group,Impr.,Clicks,Cost\nSommar,Stugor,\"64,000\",\"5,800\",\"12,500.00\"\nTotal: Account,,\"64,000\",\"5,800\",\"12,500.00\"")!;
    expect(t.skippedPreamble).toBe(2);
    expect(t.headers).toEqual(["Campaign", "Ad group", "Impr.", "Clicks", "Cost"]);
  });
  it("tomt eller en enda rad ger null", () => {
    expect(parseCsv("")).toBeNull();
    expect(parseCsv("bara en rad")).toBeNull();
  });
});

describe("gissade kolumner", () => {
  const cases: [string, string, string[], Record<string, string | null>][] = [
    ["Meta (svenska)", "Meta", ["Rapporteringen börjar", "Rapporteringen slutar", "Annonsnamn", "Annonsleverans", "Resultat", "Resultatindikator", "Räckvidd", "Visningar", "Kostnad per resultat", "Spenderat belopp (SEK)", "Länkklick", "CTR (klickfrekvens för länkar)", "Frekvens"],
      { name: "Annonsnamn", spend: "Spenderat belopp (SEK)", impressions: "Visningar", reach: "Räckvidd", clicks: "Länkklick", conversions: "Resultat" }],
    ["Meta (engelska)", "Meta", ["Reporting starts", "Reporting ends", "Ad name", "Ad delivery", "Results", "Result indicator", "Reach", "Impressions", "Cost per result", "Amount spent (SEK)", "Link clicks", "CPC (cost per link click) (SEK)", "CTR (link click-through rate)"],
      { name: "Ad name", spend: "Amount spent (SEK)", impressions: "Impressions", reach: "Reach", clicks: "Link clicks", conversions: "Results" }],
    ["TikTok", "TikTok", ["Ad name", "Cost", "CPM", "Impression", "Reach", "Clicks (destination)", "CTR (destination)", "Conversions", "Video views", "Frequency"],
      { name: "Ad name", spend: "Cost", impressions: "Impression", reach: "Reach", clicks: "Clicks (destination)", conversions: "Conversions", videoViews: "Video views" }],
    ["LinkedIn", "LinkedIn", ["Start Date (in UTC)", "Campaign Name", "Creative Name", "Total Spent", "Impressions", "Clicks", "Average CTR", "Reach (Estimated)", "Conversions", "Total Engagements"],
      { name: "Creative Name", spend: "Total Spent", impressions: "Impressions", reach: "Reach (Estimated)", clicks: "Clicks", conversions: "Conversions", engagement: "Total Engagements" }],
    ["Google Ads (svenska)", "Google Ads", ["Kampanj", "Annonsgrupp", "Visn.", "Klick", "CTR", "Genomsn. CPC", "Kostnad", "Konverteringar"],
      { name: "Kampanj", spend: "Kostnad", impressions: "Visn.", clicks: "Klick", conversions: "Konverteringar", reach: null }],
    ["Snapchat", "Snapchat", ["Ad Name", "Spend", "Paid Impressions", "Swipe Ups", "Reach", "eCPM"],
      { name: "Ad Name", spend: "Spend", impressions: "Paid Impressions", clicks: "Swipe Ups", reach: "Reach" }],
  ];
  it.each(cases)("%s", (_label, platform, headers, want) => {
    const m = guessMapping(headers);
    expect(col(headers, m.name)).toBe(want.name);
    for (const [k, v] of Object.entries(want)) if (k !== "name") expect([k, col(headers, m.metrics[k as keyof typeof m.metrics])]).toEqual([k, v]);
    expect(guessPlatform("export.csv", headers)).toBe(platform);
  });
  it("kvoter och kostnad per något väljs aldrig som rådata", () => {
    const m = guessMapping(["Ad name", "Cost per result", "CTR", "CPC", "Frequency"]);
    expect(m.metrics).toMatchObject({ spend: null, clicks: null, impressions: null });
  });
  it("filnamnet går före rubrikerna", () => {
    expect(guessPlatform("tiktok-export-juni.csv", ["Ad name", "Amount spent"])).toBe("TikTok");
  });
});

describe("plattformen byggs", () => {
  const meta = [
    "Annonsnamn;Räckvidd;Visningar;Spenderat belopp (SEK);Länkklick;Resultat",
    "Video 15 s – Sjöutsikt;168 000;412 000;8 200,00;2 900;",
    "Karusell – Stugorna;121 000;236 000;5 300,00;2 650;",
    "Resultat från 2 annonser;241 000;648 000;13 500,00;5 550;",
  ].join("\n");

  it("Meta-export: två annonser, totalradens räckvidd på plattformen, värdena stämmer med exemplet", () => {
    const t = parseCsv(meta)!;
    const r = buildPlatform(t, guessMapping(t.headers), "Meta", id);
    expect(r.ads).toBe(2);
    expect(r.skipped).toBe(1);
    expect(r.reachFromTotal).toBe(true);
    expect(r.platform.values).toEqual({ reach: 241000 });
    expect(r.platform.ads[0]).toMatchObject({ name: "Video 15 s – Sjöutsikt", values: { reach: 168000, impressions: 412000, spend: 8200, clicks: 2900 } });
    expect(r.platform.ads[0].values.conversions).toBeUndefined();
  });

  it("en rad per dag slås ihop per annons, och räckvidden tas bort eftersom den inte går att summera", () => {
    const t = parseCsv("Ad name,Day,Reach,Impressions,Cost\nA,2026-06-01,100,1000,10\nA,2026-06-02,120,1500,12.5\nB,2026-06-01,50,500,5")!;
    const r = buildPlatform(t, guessMapping(t.headers), "TikTok", id);
    expect(r.merged).toBe(1);
    expect(r.platform.ads[0]).toMatchObject({ name: "A", values: { impressions: 2500, spend: 22.5 } });
    expect(r.platform.ads[0].values.reach).toBeUndefined();
    expect(r.platform.ads[1].values.reach).toBe(50);
  });

  it("Google Ads totalrader hoppas över och engelska tal läses", () => {
    const t = parseCsv("Ad report\nCampaign,Impr.,Clicks,Cost,Conversions\nSök – Stugor,\"64,000\",\"5,800\",\"12,500.00\",341\nTotal: Campaigns,\"64,000\",\"5,800\",\"12,500.00\",341")!;
    const r = buildPlatform(t, guessMapping(t.headers), "Google Ads", id);
    expect(r.ads).toBe(1);
    expect(r.platform.ads[0].values).toEqual({ impressions: 64000, clicks: 5800, spend: 12500, conversions: 341 });
  });

  it("räknar celler som inte går att läsa", () => {
    const t = parseCsv("Ad name,Impressions\nA,mycket\nB,10")!;
    const r = buildPlatform(t, guessMapping(t.headers), "X", id);
    expect(r.badCells).toBe(1);
    expect(r.ads).toBe(1);
  });
});
