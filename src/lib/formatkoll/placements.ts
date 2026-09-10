/**
 * All plattformsspecifik konfiguration bor här. När Instagram flyttar sina
 * knappar ändrar du i den här listan, inte i CSS.
 *
 * `safe` är procent av videoytan som täcks av gränssnitt (top/right/bottom/left).
 * Värdena är uppskattade, inte uppmätta — se HANDOFF §10 om kalibrering.
 *
 * `clip` är ungefär var plattformen klipper inläggstexten. Varierar med
 * skärmbredd, så siffran är en indikation och inte en gräns.
 */

export type Ratio = "9:16" | "1:1" | "16:9";

export interface Source {
  ratio: Ratio;
  w: number;
  h: number;
  label: string;
  note: string;
}

export interface SafeZone {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ChromeKind =
  | "reels"
  | "stories"
  | "igfeed"
  | "tiktok"
  | "shorts"
  | "snap"
  | "lifeed"
  | "fbfeed";

export interface Placement {
  id: string;
  channel: string;
  name: string;
  mode: "phone" | "card";
  ratios: Ratio[];
  chrome: ChromeKind;
  clip: number | null;
  safe: SafeZone;
}

export const SOURCES: Source[] = [
  { ratio: "9:16", w: 9, h: 16, label: "Stående", note: "1080 × 1920" },
  { ratio: "1:1", w: 1, h: 1, label: "Kvadrat", note: "1080 × 1080" },
  { ratio: "16:9", w: 16, h: 9, label: "Liggande", note: "1920 × 1080" },
];

export const RATIOS: Ratio[] = ["9:16", "1:1", "16:9"];

/**
 * safe-värdena är procent av 1080 × 1920. Där en plattform publicerat en
 * pixelsiffra står den i kommentaren — dela med 19.2 för procent av höjden,
 * med 10.8 för procent av bredden. Där ingen siffra finns står "uppskattad",
 * och de raderna är fortfarande sådant som HANDOFF §10 vill mäta med skärmdump.
 *
 * Källorna spretar mest om underkanten på Reels och TikTok (320–484 px beroende
 * på källa). Vi har valt den mer konservativa änden — en skyddszon som blockerar
 * för mycket kostar en omklippning, en som blockerar för lite kostar en kund
 * som ser sin logga under en knapprad.
 */
export const PLACEMENTS: Placement[] = [
  {
    id: "ig-reels",
    channel: "Instagram",
    name: "Reels",
    mode: "phone",
    ratios: ["9:16"],
    chrome: "reels",
    clip: 72,
    // topp 200 px, höger 140 px (action-rail), botten 420 px (text + ljud + navrad), vänster 60 px
    safe: { top: 10, right: 13, bottom: 22, left: 6 },
  },
  {
    id: "ig-stories",
    channel: "Instagram",
    name: "Stories",
    mode: "phone",
    ratios: ["9:16"],
    chrome: "stories",
    clip: null,
    // Metas egen siffra: topp 250 px, botten 340 px (navrad 250 + CTA ~90).
    // Sidorna uppskattade — Meta publicerar ingen sidmarginal för Stories.
    safe: { top: 13, right: 6, bottom: 17.7, left: 6 },
  },
  {
    id: "ig-feed",
    channel: "Instagram",
    name: "Feed",
    mode: "card",
    ratios: ["1:1"],
    chrome: "igfeed",
    clip: 125,
    // Feed lägger inget gränssnitt ovanpå videon — allt ligger i kortet runt om.
    safe: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    id: "tiktok",
    channel: "TikTok",
    name: "För dig",
    mode: "phone",
    ratios: ["9:16"],
    chrome: "tiktok",
    clip: 70,
    // höger 164 px (ikonstapeln), botten 394 px (text, ljud, kontonamn),
    // vänster 44 px (kantbeskärning).
    // Toppen: källorna säger 130–140 px, men TikTok har samma statusrad plus
    // Följer/För dig-rad som Reels, och den ryms inte på 140 px. Satt till
    // samma 10 % som Reels — två identiska gränssnitt ska inte ha olika zon.
    safe: { top: 10, right: 15, bottom: 20, left: 4 },
  },
  {
    id: "shorts",
    channel: "YouTube",
    name: "Shorts",
    mode: "phone",
    ratios: ["9:16"],
    chrome: "shorts",
    clip: 60,
    // YouTube anger fri yta som mitten 1080 × 1350, alltså 570 px UI totalt på höjden.
    // Fördelat topp 150 px / botten 420 px (kanalinfo + musikticker väger tyngst).
    // Höger 140 px för prenumerera/gilla/kommentera/dela.
    safe: { top: 8, right: 13, bottom: 22, left: 6 },
  },
  {
    id: "snap",
    channel: "Snapchat",
    name: "Spotlight",
    mode: "phone",
    ratios: ["9:16"],
    chrome: "snap",
    clip: null,
    // Snapchat lägger avsändarnamn, rubrik och stängkryss inom översta 200 px
    // (10,4 %). Avsändarpillret renderas till 10,6 %, så zonen är satt till 11 %
    // för att täcka det. Botten och höger uppskattade — Snap publicerar inga
    // siffror för Spotlight.
    safe: { top: 11, right: 14, bottom: 16, left: 6 },
  },
  {
    id: "li-feed",
    channel: "LinkedIn",
    name: "Flöde",
    mode: "card",
    ratios: ["1:1", "16:9"],
    chrome: "lifeed",
    clip: 140,
    safe: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    id: "fb-feed",
    channel: "Facebook",
    name: "Flöde",
    mode: "card",
    ratios: ["1:1", "16:9"],
    chrome: "fbfeed",
    clip: 125,
    safe: { top: 0, right: 0, bottom: 0, left: 0 },
  },
];

export const sourceFor = (ratio: Ratio): Source =>
  SOURCES.find((s) => s.ratio === ratio) ?? SOURCES[0];

/** Klipper texten där plattformen klipper den. */
export function clipCaption(raw: string, clip: number | null) {
  if (!clip || raw.length <= clip) return { text: raw, clipped: false };
  return { text: raw.slice(0, clip).trimEnd() + "… mer", clipped: true };
}

export interface NaturalSize {
  w: number;
  h: number;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * Etiketten under ramen. Innan filen är inläst vet vi bara vad slotten heter,
 * så då visas slottens nominella mått. När videon rapporterat sina riktiga
 * dimensioner visas de i stället — en 4:5-film i kvadratslotten ska inte
 * påstå att den är 1080 × 1080.
 */
export function frameLabel(ratio: Ratio, natural: NaturalSize | undefined): string {
  const src = sourceFor(ratio);
  if (!natural || !natural.w || !natural.h) return `${ratio} · ${src.note}`;
  const d = gcd(natural.w, natural.h);
  return `${natural.w / d}:${natural.h / d} · ${natural.w} × ${natural.h}`;
}

/** Ramens proportion: filens egen om den är känd, annars slottens nominella. */
export function frameRatio(ratio: Ratio, natural: NaturalSize | undefined): string {
  if (natural?.w && natural?.h) return `${natural.w} / ${natural.h}`;
  const src = sourceFor(ratio);
  return `${src.w} / ${src.h}`;
}

/**
 * Samma proportion som ett tal, bredd delat med höjd.
 *
 * Telefonramen kan inte använda aspect-ratio. Safari räknar inte fram bredden
 * ur den när höjden kommer genom en calc- och procentkedja — höjden blir rätt
 * och bredden kollapsar till innehållets. Ramen räknar därför bredden själv med
 * calc, och behöver proportionen som ett tal i stället för som "1080 / 1920".
 */
export function frameAspect(ratio: Ratio, natural: NaturalSize | undefined): number {
  if (natural?.w && natural?.h) return natural.w / natural.h;
  const src = sourceFor(ratio);
  return src.w / src.h;
}

/**
 * Texten som en placering faktiskt visar: kanalens egen om den finns, annars
 * den delade. Tom sträng räknas som en giltig egen text — någon kan vilja köra
 * en kanal helt utan text.
 */
export function captionFor(
  placementId: string,
  shared: string,
  overrides: Record<string, string> | undefined,
): string {
  const own = overrides?.[placementId];
  return own === undefined ? shared : own;
}
