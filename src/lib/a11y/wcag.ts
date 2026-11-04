/**
 * WCAG 2.2 framgångskriterier på nivå A och AA, med svenska arbetsnamn
 * (inte kontrollerade mot en officiell översättning). axe-core märker sina regler med taggar som "wcag143";
 * här blir de "1.4.3 Kontrast (minimum)".
 */
export const CRITERIA: Record<string, { name: string; level: "A" | "AA" }> = {
  "1.1.1": { name: "Icke-textuellt innehåll", level: "A" },
  "1.2.1": { name: "Enbart ljud och enbart video (förinspelat)", level: "A" },
  "1.2.2": { name: "Undertexter (förinspelat)", level: "A" },
  "1.2.3": { name: "Syntolkning eller mediealternativ (förinspelat)", level: "A" },
  "1.2.4": { name: "Undertexter (direktsänt)", level: "AA" },
  "1.2.5": { name: "Syntolkning (förinspelat)", level: "AA" },
  "1.3.1": { name: "Information och relationer", level: "A" },
  "1.3.2": { name: "Meningsfull ordningsföljd", level: "A" },
  "1.3.3": { name: "Sensoriska egenskaper", level: "A" },
  "1.3.4": { name: "Visningsläge", level: "AA" },
  "1.3.5": { name: "Identifiera syftet med inmatningar", level: "AA" },
  "1.4.1": { name: "Användning av färg", level: "A" },
  "1.4.2": { name: "Ljudstyrning", level: "A" },
  "1.4.3": { name: "Kontrast (minimum)", level: "AA" },
  "1.4.4": { name: "Ändra textstorlek", level: "AA" },
  "1.4.5": { name: "Bilder av text", level: "AA" },
  "1.4.10": { name: "Anpassning till skärmstorlek", level: "AA" },
  "1.4.11": { name: "Kontrast för icke-textuellt innehåll", level: "AA" },
  "1.4.12": { name: "Textavstånd", level: "AA" },
  "1.4.13": { name: "Innehåll vid hovring eller fokus", level: "AA" },
  "2.1.1": { name: "Tangentbord", level: "A" },
  "2.1.2": { name: "Ingen tangentbordsfälla", level: "A" },
  "2.1.4": { name: "Kortkommandon med tecken", level: "A" },
  "2.2.1": { name: "Justerbar tidsgräns", level: "A" },
  "2.2.2": { name: "Pausa, stoppa, dölja", level: "A" },
  "2.3.1": { name: "Tre blinkningar eller under tröskelvärdet", level: "A" },
  "2.4.1": { name: "Hoppa över block", level: "A" },
  "2.4.2": { name: "Sidtitel", level: "A" },
  "2.4.3": { name: "Fokusordning", level: "A" },
  "2.4.4": { name: "Länkars syfte (i sammanhanget)", level: "A" },
  "2.4.5": { name: "Flera sätt", level: "AA" },
  "2.4.6": { name: "Rubriker och etiketter", level: "AA" },
  "2.4.7": { name: "Synligt fokus", level: "AA" },
  "2.4.11": { name: "Fokus inte dolt (minimum)", level: "AA" },
  "2.5.1": { name: "Pekargester", level: "A" },
  "2.5.2": { name: "Avbryta pekarinteraktion", level: "A" },
  "2.5.3": { name: "Etikett i namn", level: "A" },
  "2.5.4": { name: "Rörelseaktivering", level: "A" },
  "2.5.7": { name: "Dragrörelser", level: "AA" },
  "2.5.8": { name: "Målstorlek (minimum)", level: "AA" },
  "3.1.1": { name: "Sidans språk", level: "A" },
  "3.1.2": { name: "Språk för delar", level: "AA" },
  "3.2.1": { name: "Vid fokus", level: "A" },
  "3.2.2": { name: "Vid inmatning", level: "A" },
  "3.2.3": { name: "Konsekvent navigering", level: "AA" },
  "3.2.4": { name: "Konsekvent identifiering", level: "AA" },
  "3.2.6": { name: "Konsekvent hjälp", level: "A" },
  "3.3.1": { name: "Identifiering av fel", level: "A" },
  "3.3.2": { name: "Etiketter eller instruktioner", level: "A" },
  "3.3.3": { name: "Förslag vid fel", level: "AA" },
  "3.3.4": { name: "Förhindra fel (juridiska, ekonomiska, data)", level: "AA" },
  "3.3.7": { name: "Överflödig inmatning", level: "A" },
  "3.3.8": { name: "Tillgänglig autentisering (minimum)", level: "AA" },
  "4.1.2": { name: "Namn, roll, värde", level: "A" },
  "4.1.3": { name: "Statusmeddelanden", level: "AA" },
};

/** axe-taggarna som motsvarar WCAG 2.2 nivå A och AA. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** "wcag1410" → "1.4.10". Taggar som inte är kriterier (wcag2aa …) ger null. */
export function criterionOf(tag: string): string | null {
  const m = tag.match(/^wcag(\d)(\d)(\d{1,2})$/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

export const criteriaOf = (tags: string[]) => tags.map(criterionOf).filter((c): c is string => c !== null);

/** Strängaste nivån bland reglernas kriterier: A är grundkravet, AA nästa. */
export function levelOf(criteria: string[], tags: string[]): "A" | "AA" {
  if (criteria.some((c) => CRITERIA[c]?.level === "A")) return "A";
  if (criteria.length > 0) return "AA";
  return tags.some((t) => /^wcag2\d?a$/.test(t)) ? "A" : "AA";
}

export const criterionLabel = (c: string) => (CRITERIA[c] ? `${c} ${CRITERIA[c].name}` : c);

/** Länk till W3C:s förklaring av kriteriet. */
export function criterionUrl(c: string): string {
  const slug = CRITERIA[c]?.name ? W3C_SLUGS[c] : undefined;
  return slug ? `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html` : "https://www.w3.org/WAI/WCAG22/quickref/";
}

const W3C_SLUGS: Record<string, string> = {
  "1.1.1": "non-text-content",
  "1.2.2": "captions-prerecorded",
  "1.3.1": "info-and-relationships",
  "1.3.4": "orientation",
  "1.3.5": "identify-input-purpose",
  "1.4.1": "use-of-color",
  "1.4.2": "audio-control",
  "1.4.3": "contrast-minimum",
  "1.4.4": "resize-text",
  "1.4.10": "reflow",
  "1.4.11": "non-text-contrast",
  "1.4.12": "text-spacing",
  "2.1.1": "keyboard",
  "2.2.1": "timing-adjustable",
  "2.2.2": "pause-stop-hide",
  "2.4.1": "bypass-blocks",
  "2.4.2": "page-titled",
  "2.4.4": "link-purpose-in-context",
  "2.4.7": "focus-visible",
  "2.5.3": "label-in-name",
  "2.5.8": "target-size-minimum",
  "3.1.1": "language-of-page",
  "3.1.2": "language-of-parts",
  "3.3.2": "labels-or-instructions",
  "4.1.2": "name-role-value",
};
