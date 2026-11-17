import "server-only";
import { parseCard, withStatus, type Card, type StatusKey } from "./cards";

const REPO = process.env.JARVIS_REPO ?? "jock3/brain";
const DIR = "board";
const API = `https://api.github.com/repos/${REPO}/contents`;

function headers() {
  const token = process.env.JARVIS_GITHUB_TOKEN;
  if (!token) throw new Error("JARVIS_GITHUB_TOKEN saknas");
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

interface Entry {
  name: string;
}

/** Alla kort i vaultet. Hämtar filerna parallellt; no-store så att tavlan alltid visar vaultet. */
export async function listCards(): Promise<Card[]> {
  const res = await fetch(`${API}/${DIR}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub ${res.status} vid läsning av ${DIR}/`);
  const entries = ((await res.json()) as Entry[]).filter((e) => e.name.endsWith(".md"));
  const cards = await Promise.all(
    entries.map(async (e) => {
      const r = await fetch(`${API}/${DIR}/${e.name}`, {
        headers: { ...headers(), Accept: "application/vnd.github.raw+json" },
        cache: "no-store",
      });
      return r.ok ? parseCard(await r.text()) : null;
    }),
  );
  return cards.filter((c): c is Card => c !== null);
}

/** Flyttar ett kort: ändrar status-raden och committar till vaultet. */
export async function moveCard(id: string, status: StatusKey): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Ogiltigt id");
  const url = `${API}/${DIR}/${id}.md`;
  const cur = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!cur.ok) throw new Error(`Kortet finns inte (${cur.status})`);
  const file = (await cur.json()) as { sha: string; content: string };
  const md = Buffer.from(file.content, "base64").toString("utf8");
  const next = withStatus(md, status);
  if (next === md) return;
  const put = await fetch(url, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `board: ${id} → ${status}`,
      content: Buffer.from(next, "utf8").toString("base64"),
      sha: file.sha,
    }),
  });
  if (!put.ok) throw new Error(`GitHub ${put.status} vid sparning`);
}
