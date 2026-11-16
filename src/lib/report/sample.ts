import type { ReportDoc } from "./doc";
import type { Ad, PlatformRow, Values } from "./kpis";
import type { StatsLike } from "./summary";

/** Exempelkampanjerna från prototypen (Solbacka Camping, påhittad kund). Används av testerna och av "Visa exempelrapporten". */
const ad = (id: string, name: string, values: Values): Ad => ({ id, name, values });
const pl = (id: string, name: string, values: Values, ads: Ad[] = []): PlatformRow => ({ id, name, values, ads });

export const SAMPLE_AWARENESS: StatsLike = {
  title: "Kännedomskampanj",
  platforms: [
    pl("a-meta", "Meta", { reach: 241000 }, [
      ad("a1", "Video 15 s – Sjöutsikt", { spend: 8200, impressions: 412000, reach: 168000, clicks: 2900 }),
      ad("a2", "Karusell – Stugorna", { spend: 5300, impressions: 236000, reach: 121000, clicks: 2650 }),
    ]),
    pl("a-tiktok", "TikTok", { reach: 398000 }, [
      ad("a3", "UGC – Morgondoppet", { spend: 6500, impressions: 538000, reach: 301000, clicks: 3100 }),
      ad("a4", "Spark Ad – Familjen Ek", { spend: 3000, impressions: 214000, reach: 152000, clicks: 1180 }),
    ]),
    pl("a-snap", "Snapchat", { spend: 4000, impressions: 296000, reach: 178000, clicks: 890 }),
  ],
};

export const SAMPLE_BOOKING: StatsLike = {
  title: "Bokningskampanj",
  platforms: [
    pl("b-meta", "Meta", {}, [
      ad("b1", "Retargeting – Sista minuten", { spend: 9400, impressions: 188000, clicks: 4100, conversions: 212 }),
      ad("b2", "Katalog – Lediga stugor", { spend: 7100, impressions: 156000, clicks: 3350, conversions: 168 }),
    ]),
    pl("b-google", "Google Ads", { spend: 12500, impressions: 64000, clicks: 5800, conversions: 341 }),
    pl("b-tiktok", "TikTok", { spend: 4200, impressions: 241000, clicks: 1500, conversions: 38 }),
  ],
};

export const SAMPLE_STATS: StatsLike[] = [SAMPLE_AWARENESS, SAMPLE_BOOKING];


/** Hela exempelrapporten från prototypen (Solbacka Camping). Används av "Visa exempelrapporten" och av skärmbildskontrollen. */
export function sampleDoc(date = "16 november 2026"): ReportDoc {
  return {
    version: 1,
    meta: { client: "Solbacka Camping", campaign: "Sommarsäsongen 2026", period: "1 juni – 31 augusti 2026", date, agency: "Milou Communication" },
    logos: {},
    sections: [
      { id: "s-cover", type: "cover", subtitle: "Utvärdering av annonsering i sociala medier" },
      {
        id: "s-kpi", type: "kpi", heading: "Det här mäter vi",
        intro: "Vi har valt mått som visar både hur många vi nådde och hur många som tog nästa steg och bokade.",
        kpis: ["spend", "impressions", "reach", "frequency", "clicks", "ctr", "cpc", "cpm", "conversions", "cpa"], descs: {},
      },
      {
        id: "s-aware", type: "stats", title: SAMPLE_AWARENESS.title, subtitle: "Mål: synas brett inför sommaren · 1–30 juni",
        kpis: ["spend", "impressions", "reach", "frequency", "cpm", "clicks", "ctr"], showAds: true, platforms: SAMPLE_AWARENESS.platforms,
      },
      {
        id: "s-book", type: "stats", title: SAMPLE_BOOKING.title, subtitle: "Mål: fler bokningar på webben · 1 juli – 31 augusti",
        kpis: ["spend", "impressions", "clicks", "ctr", "cpc", "conversions", "cpa"], showAds: true, platforms: SAMPLE_BOOKING.platforms,
      },
      {
        id: "s-comment", type: "comment", label: "Kommentar", heading: "Vad vi tar med oss",
        body:
          "TikTok gav mest synlighet för pengarna i kännedomsfasen, med lägst CPM av alla kanaler. Rörligt innehåll i UGC-stil, där riktiga gäster visar campingen, slog de mer polerade annonserna.\n\n" +
          "I bokningsfasen levererade Google Ads lägst kostnad per bokning. Retargeting på Meta låg nära, vilket visar att kännedomsfasen byggde en bra publik att följa upp.\n\n" +
          "Inför nästa säsong rekommenderar vi:\n- Låt TikTok fokusera helt på kännedom\n- Flytta TikToks bokningsbudget till sök och retargeting\n- Starta retargeting redan i juni, medan intresset är som störst",
      },
      {
        id: "s-summary", type: "summary", heading: "Hela säsongen i siffror", kpis: ["spend", "impressions", "clicks", "ctr", "cpc", "conversions", "cpa"],
        showTiles: true, showBudget: true, showInsights: true,
        conclusion: "Säsongen gav 759 bokningar till 44 kr styck i bokningsfasen. Kännedomsfasen byggde publiken som retargetingen sedan konverterade.",
      },
    ],
  };
}
