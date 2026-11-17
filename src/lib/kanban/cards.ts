/** Kort i Jarvis-vaultet (jock3/brain, mappen board/). Ren fil: ingen server-kod. */
export const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Att göra" },
  { key: "doing", label: "Pågår" },
  { key: "waiting", label: "Väntar på" },
  { key: "done", label: "Klart" },
] as const;
export type StatusKey = (typeof STATUSES)[number]["key"];
export const isStatus = (v: unknown): v is StatusKey => STATUSES.some((s) => s.key === v);

export interface Card {
  id: string;
  title: string;
  project: string;
  status: StatusKey;
  prio: "hog" | "medel" | "lag";
  created: string;
  body: string;
}

/** Läser frontmatter (platta nyckel: värde-rader) och brödtext. Null om id eller titel saknas. */
export function parseCard(md: string): Card | null {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!fm.id || !fm.title) return null;
  return {
    id: fm.id,
    title: fm.title,
    project: fm.project ?? "",
    status: isStatus(fm.status) ? fm.status : "backlog",
    prio: fm.prio === "hog" || fm.prio === "lag" ? fm.prio : "medel",
    created: fm.created ?? "",
    body: m[2].trim(),
  };
}

/** Byter bara status-raden så att resten av filen förblir orörd. */
export function withStatus(md: string, status: StatusKey): string {
  return md.replace(/^status:.*$/m, `status: ${status}`);
}
