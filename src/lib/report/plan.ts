/** Period som text i rapporten: "1 jun – 31 aug 2026", "28 dec 2026 – 3 jan 2027". Tomt om datumen är ogiltiga. */
export function planPeriod(start: string | null | undefined, end: string | null | undefined): string {
  const parse = (s: string | null | undefined) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const a = parse(start);
  const b = parse(end);
  if (!a || !b) return "";
  const MON = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const dm = (d: Date) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
  const full = (d: Date) => `${dm(d)} ${d.getUTCFullYear()}`;
  if (a.getTime() === b.getTime()) return full(a);
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${dm(a)} – ${full(b)}`;
  return `${full(a)} – ${full(b)}`;
}

/** Taggar från en plan, rensade så de får plats i databasen och rapportlistan. */
export function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const t of tags) {
    const s = typeof t === "string" ? t.trim().slice(0, 40) : "";
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 20) break;
  }
  return out;
}
