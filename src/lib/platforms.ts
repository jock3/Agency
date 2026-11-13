import {
  siMeta, siTiktok, siYoutube, siSnapchat, siPinterest,
  siX, siThreads, siReddit, siSpotify, siTwitch,
} from "simple-icons";
import { Newspaper, MonitorPlay, Radio, Clapperboard, type LucideIcon } from "lucide-react";

/* Plattformar för mediaplanens sociala medier: varumärkets egen färg och logotyp.
   simple-icons saknar LinkedIn, så den ritas här (24 × 24, samma format). */
export interface Platform {
  key: string;
  name: string;
  /** Varumärkets färg. */
  color: string;
  /** SVG-bana i ett 24 × 24-rutnät. */
  path?: string;
  /** Ikon för kanaler som saknar eget varumärke. */
  icon?: LucideIcon;
  /** Valbara enheter för kanalen, första är standard. */
  units?: string[];
  /** Äldre radnamn som också hör till plattformen. */
  aliases?: string[];
}

const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

export const PLATFORMS: Platform[] = [
  { key: "meta", name: "Meta", color: `#${siMeta.hex}`, path: siMeta.path, aliases: ["facebook", "instagram"] },
  { key: "tiktok", name: "TikTok", color: "#000000", path: siTiktok.path },
  { key: "linkedin", name: "LinkedIn", color: "#0A66C2", path: LINKEDIN_PATH },
  { key: "youtube", name: "YouTube", color: `#${siYoutube.hex}`, path: siYoutube.path },
  { key: "snapchat", name: "Snapchat", color: `#${siSnapchat.hex}`, path: siSnapchat.path },
  { key: "pinterest", name: "Pinterest", color: `#${siPinterest.hex}`, path: siPinterest.path },
  { key: "x", name: "X", color: "#000000", path: siX.path },
  { key: "threads", name: "Threads", color: "#000000", path: siThreads.path },
  { key: "reddit", name: "Reddit", color: `#${siReddit.hex}`, path: siReddit.path },
  { key: "spotify", name: "Spotify", color: "#1DB954", path: siSpotify.path },
  { key: "twitch", name: "Twitch", color: `#${siTwitch.hex}`, path: siTwitch.path },
];

/** Kanaler i extern media. Färgerna kommer från Milous palett. */
export const EXTERN_CHANNELS: Platform[] = [
  { key: "tidning", name: "Tidning", color: "#5B173C", icon: Newspaper, units: ["Helsida", "Halvsida", "Kvartsida"] },
  { key: "display", name: "Display", color: "#E60330", icon: MonitorPlay },
  { key: "radio", name: "Radio", color: "#F59E0B", icon: Radio },
  { key: "bio", name: "Bio", color: "#931644", icon: Clapperboard },
];

/** Raden hör till en plattform om namnet är plattformens namn (versaler spelar ingen roll). */
// om namnet är plattformens namn (versaler spelar ingen roll). */
export function findPlatform(name: string): Platform | undefined {
  const n = name.trim().toLowerCase();
  return [...PLATFORMS, ...EXTERN_CHANNELS].find((p) => p.name.toLowerCase() === n || p.key === n || p.aliases?.includes(n));
}
