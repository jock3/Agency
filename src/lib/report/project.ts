import { blankDoc, normalizeDoc, type ReportDoc } from "./doc";

/** Filnamn för projektfilen och PDF:en: "Rapport {kund} {kampanj}". */
export function fileBase(doc: ReportDoc): string {
  const m = doc.meta;
  return (
    ["Rapport", m.client, m.campaign]
      .filter(Boolean)
      .join(" ")
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Rapport"
  );
}

/**
 * Läser en projektfil (.json), också de som sparats från prototypen. Innehållet
 * rensas av normalizeDoc, så en handgjord eller trasig fil kan inte föra in
 * något som inte hör hemma i en rapport. Null om filen inte är en rapport.
 */
export function parseProjectFile(text: string): ReportDoc | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (!raw || typeof raw !== "object" || !Array.isArray((raw as { sections?: unknown }).sections)) return null;
    return normalizeDoc(raw);
  } catch {
    return null;
  }
}

/** Den inlästa rapporten, med nuvarande logotyper kvar. Filens egna logotyper går före vid samma namn. */
export const withLogos = (incoming: ReportDoc, current: ReportDoc): ReportDoc => ({ ...incoming, logos: { ...current.logos, ...incoming.logos } });

/** Ny tom rapport som behåller logotyperna. */
export const blankKeepingLogos = (current: ReportDoc): ReportDoc => ({ ...blankDoc(), logos: current.logos });
