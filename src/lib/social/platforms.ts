import { PLACEMENTS, type Placement } from "@/lib/formatkoll/placements";

/**
 * Plattformarna i utvärderingsverktyget för stillbilder. Placeringarna,
 * skyddszonerna och var texten klipps hämtas ur formatkollens PLACEMENTS, så
 * att teamet har en enda lista att justera. Det som är specifikt för bilder
 * står här.
 *
 * Alla värden är riktvärden. Plattformarna publicerar få exakta siffror, och
 * källorna (kontrollerade 2026-11-04) är mest tredjepartsguider som spretar:
 * Instagram-flödets nya 3:4-format är t.ex. obekräftat, och ingen källa anger
 * var texten klipps på LinkedIn eller Facebook. Ändra här när en plattform
 * ändrar sig, och kontrollera mot plattformens egen hjälpsida.
 */

export interface SocialPlatform {
  /** Samma id som placeringen i formatkollen. */
  id: string;
  channel: string;
  name: string;
  /** Rubrik över textfältet. Stories har ingen bildtext, bara text i bilden. */
  textLabel: string;
  /** Bredd delat med höjd som visas utan beskärning. */
  fit: { min: number; max: number };
  /** Vad vi rekommenderar, som text. */
  ideal: string;
  /** Högsta antal tecken i texten, om plattformen har en känd gräns. */
  textMax: number | null;
  /** Fullskärm i stående format, där gränssnittet ligger ovanpå bilden. */
  fullscreen: boolean;
  placement: Placement;
}

const placement = (id: string): Placement => {
  const p = PLACEMENTS.find((x) => x.id === id);
  if (!p) throw new Error(`Placering saknas i formatkollen: ${id}`);
  return p;
};

export const PLATFORMS: SocialPlatform[] = [
  {
    id: "ig-feed",
    channel: "Instagram",
    name: "Flöde",
    textLabel: "Bildtext",
    fit: { min: 0.74, max: 1.92 },
    ideal: "4:5 (1080 × 1350) eller 1:1 (1080 × 1080)",
    textMax: 2200,
    fullscreen: false,
    placement: placement("ig-feed"),
  },
  {
    id: "ig-stories",
    channel: "Instagram",
    name: "Stories",
    textLabel: "Text i storyn",
    fit: { min: 0.54, max: 0.58 },
    ideal: "9:16 (1080 × 1920)",
    textMax: null,
    fullscreen: true,
    placement: placement("ig-stories"),
  },
  {
    id: "li-feed",
    channel: "LinkedIn",
    name: "Flöde",
    textLabel: "Inläggstext",
    fit: { min: 0.74, max: 1.92 },
    ideal: "4:5, 1:1 eller 1,91:1",
    textMax: 3000,
    fullscreen: false,
    placement: placement("li-feed"),
  },
  {
    id: "fb-feed",
    channel: "Facebook",
    name: "Flöde",
    textLabel: "Inläggstext",
    fit: { min: 0.74, max: 1.92 },
    ideal: "4:5 (1080 × 1350), 1:1 eller 1,91:1",
    textMax: null,
    fullscreen: false,
    placement: placement("fb-feed"),
  },
  {
    id: "tiktok",
    channel: "TikTok",
    name: "Bildinlägg",
    textLabel: "Bildtext",
    fit: { min: 0.54, max: 0.58 },
    ideal: "9:16 (1080 × 1920)",
    // Källorna spretar (2 200 i appen, betydligt kortare via API). Vi varnar
    // inte på längden för TikTok.
    textMax: null,
    fullscreen: true,
    placement: placement("tiktok"),
  },
];

export const platformById = (id: unknown) => PLATFORMS.find((p) => p.id === id);

export const platformLabel = (p: SocialPlatform) => `${p.channel} ${p.name}`;
