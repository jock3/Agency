import { clipCaption } from "@/lib/formatkoll/placements";
import type { SocialPlatform } from "./platforms";

/**
 * Det som går att mäta utan AI: format, upplösning, textlängd och vad som syns
 * före "mer". Siffrorna räknas här, inte av modellen (docs/ai-rules.md).
 * Gränserna är riktvärden, se platforms.ts.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface SocialCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

/** Bildens verkliga mått i pixlar, mätta i webbläsaren innan den förminskades. */
export interface ImageDims {
  width: number;
  height: number;
}

export const MAX_IMAGES = 6;

const nf = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 });
const ratioText = (d: ImageDims) => `${nf.format(d.width / d.height)}:1`;
const fits = (d: ImageDims, p: SocialPlatform) => {
  const r = d.width / d.height;
  return r >= p.fit.min && r <= p.fit.max;
};
const list = (nums: number[]) => nums.map((n) => `bild ${n}`).join(", ");

const URL_RE = /https?:\/\/\S+|\bwww\.\S+/i;
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/gu;

export function runChecks(platform: SocialPlatform, text: string, images: ImageDims[]): SocialCheck[] {
  const checks: SocialCheck[] = [];
  const trimmed = text.trim();

  if (images.length > 0) {
    // Format: passar bilderna plattformens yta utan beskärning eller kanter?
    const off = images.flatMap((d, i) => (fits(d, platform) ? [] : [i + 1]));
    checks.push(
      off.length === 0
        ? { id: "format", label: "Bildformat", status: "pass", detail: `Proportionerna passar ${platform.channel} ${platform.name}.` }
        : {
            id: "format",
            label: "Bildformat",
            status: "warn",
            detail: `${list(off)} har proportionerna ${off.map((n) => ratioText(images[n - 1])).join(", ")}. ${platform.channel} ${platform.name} visar bäst ${platform.ideal}, annars beskärs bilden eller får kanter.`,
          },
    );

    // Karusell: olika proportioner brukar beskäras till den första bildens.
    if (images.length > 1 && !platform.fullscreen) {
      const first = images[0].width / images[0].height;
      const mixed = images.some((d) => Math.abs(d.width / d.height - first) > 0.02);
      checks.push({
        id: "uniform",
        label: "Lika proportioner i karusellen",
        status: mixed ? "warn" : "pass",
        detail: mixed
          ? "Bilderna har olika proportioner. I en karusell kan de beskäras till den förstas format."
          : "Alla bilder har samma proportioner.",
      });
    }

    // Upplösning: bredd i pixlar. Under 1080 syns suddigheten på mobilen.
    const soft = images.flatMap((d, i) => (d.width < 1080 ? [i + 1] : []));
    const tiny = images.flatMap((d, i) => (d.width < 600 ? [i + 1] : []));
    checks.push(
      tiny.length > 0
        ? { id: "resolution", label: "Upplösning", status: "fail", detail: `${list(tiny)} är under 600 px bred och blir tydligt suddig. Använd minst 1080 px.` }
        : soft.length > 0
          ? {
              id: "resolution",
              label: "Upplösning",
              status: "warn",
              detail: `${list(soft)} är ${soft.map((n) => images[n - 1].width).join(", ")} px bred. Riktvärdet är minst 1080 px.`,
            }
          : { id: "resolution", label: "Upplösning", status: "pass", detail: "Alla bilder är minst 1080 px breda." },
    );
  }

  if (!platform.fullscreen && !trimmed) {
    checks.push({ id: "empty", label: platform.textLabel, status: "warn", detail: "Ingen text är angiven. Inlägget granskas som bara bild." });
  }

  if (trimmed) {
    const len = [...trimmed].length;
    if (platform.textMax && len > platform.textMax) {
      checks.push({
        id: "length",
        label: "Textlängd",
        status: "fail",
        detail: `${nf.format(len)} tecken. ${platform.channel} tillåter ungefär ${nf.format(platform.textMax)}.`,
      });
    } else {
      checks.push({
        id: "length",
        label: "Textlängd",
        status: "info",
        detail: platform.textMax ? `${nf.format(len)} av ungefär ${nf.format(platform.textMax)} tecken.` : `${nf.format(len)} tecken.`,
      });
    }

    // Var texten klipps är en indikation (formatkollens värde), inte en gräns.
    const clip = platform.placement.clip;
    if (clip && !platform.fullscreen) {
      const { text: visible, clipped } = clipCaption(trimmed, clip);
      checks.push({
        id: "clip",
        label: "Syns före ”mer”",
        status: "info",
        detail: clipped
          ? `Ungefär de första ${clip} tecknen: ”${visible.replace(/… mer$/, "").replace(/\s+/g, " ")}”. Resten kräver ett klick. Det varierar med skärmbredd.`
          : "Hela texten ryms utan att klippas.",
      });
    }

    const tags = trimmed.match(HASHTAG_RE)?.length ?? 0;
    if (tags > 0) {
      checks.push({
        id: "hashtags",
        label: "Hashtaggar",
        status: platform.channel === "Instagram" && tags > 30 ? "fail" : "info",
        detail:
          platform.channel === "Instagram" && tags > 30
            ? `${tags} hashtaggar. Instagram tillåter högst 30.`
            : `${tags} ${tags === 1 ? "hashtagg" : "hashtaggar"}. Relevansen bedöms i granskningen.`,
      });
    }

    // Instagram gör inte länkar i inläggstext klickbara.
    if (platform.channel === "Instagram" && URL_RE.test(trimmed)) {
      checks.push({
        id: "link",
        label: "Länk i texten",
        status: "warn",
        detail: "Länkar i Instagrams inläggstext är inte klickbara. Hänvisa till länken i profilen eller använd en länkdekal i Stories.",
      });
    }
  }

  return checks;
}
