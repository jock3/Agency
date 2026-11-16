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
