/**
 * Läser en Figma-fil via Figmas REST-API. Bara api.figma.com anropas, med
 * filnyckeln ur länken, så användaren kan inte styra servern mot en annan
 * adress. Token (FIGMA_TOKEN) finns bara på servern.
 */

const API = "https://api.figma.com";
const TIMEOUT_MS = 20_000;
/** Så många frames granskas per körning. */
export const MAX_FRAMES = 4;

export class FigmaError extends Error {
  constructor(public code: "FIGMA_DISABLED" | "INVALID_FIGMA_URL" | "FIGMA_NO_ACCESS" | "FIGMA_NOT_FOUND" | "FIGMA_RATE_LIMIT" | "FIGMA_ERROR" | "FIGMA_NO_FRAMES") {
    super(code);
  }
}

export const figmaEnabled = () => Boolean(process.env.FIGMA_TOKEN);

export interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: { r: number; g: number; b: number; a?: number };
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  opacity?: number;
  characters?: string;
  fills?: FigmaPaint[];
  style?: { fontSize?: number; fontWeight?: number };
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: FigmaNode[];
}

/** Plockar ut filnyckel och eventuell nod ur en Figma-länk. Allt annat än figma.com nekas. */
export function parseFigmaUrl(input: string): { fileKey: string; nodeId: string | null } | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || (u.hostname !== "figma.com" && u.hostname !== "www.figma.com")) return null;
  const m = u.pathname.match(/^\/(?:design|file|proto)\/([A-Za-z0-9]{10,40})(?:\/|$)/);
  if (!m) return null;
  // Länken skriver noden som 12-34, API:t vill ha 12:34.
  const raw = u.searchParams.get("node-id");
  const nodeId = raw && /^\d+[-:]\d+$/.test(raw) ? raw.replace("-", ":") : null;
  return { fileKey: m[1], nodeId };
}

async function figma<T>(path: string): Promise<T> {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new FigmaError("FIGMA_DISABLED");
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: { "X-Figma-Token": token }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new FigmaError("FIGMA_ERROR");
  }
  if (res.status === 403) throw new FigmaError("FIGMA_NO_ACCESS");
  if (res.status === 404) throw new FigmaError("FIGMA_NOT_FOUND");
  if (res.status === 429) throw new FigmaError("FIGMA_RATE_LIMIT");
  if (!res.ok) throw new FigmaError("FIGMA_ERROR");
  return (await res.json()) as T;
}

const FRAME_TYPES = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "SECTION"]);

/**
 * Frames att granska. Med nod i länken gäller den (är den en sida eller en
 * sektion tas dess frames); utan nod tas första sidans första frames.
 */
async function frameIds(fileKey: string, nodeId: string | null): Promise<{ ids: string[]; fileName: string }> {
  if (nodeId) {
    const data = await figma<{ name: string; nodes: Record<string, { document: FigmaNode } | null> }>(
      `/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=1`,
    );
    const doc = data.nodes[nodeId]?.document;
    if (!doc) throw new FigmaError("FIGMA_NOT_FOUND");
    if (doc.type === "CANVAS" || doc.type === "SECTION") {
      const ids = (doc.children ?? []).filter((c) => FRAME_TYPES.has(c.type) && c.visible !== false).map((c) => c.id);
      return { ids: ids.slice(0, MAX_FRAMES), fileName: data.name };
    }
    return { ids: [nodeId], fileName: data.name };
  }
  const data = await figma<{ name: string; document: FigmaNode }>(`/v1/files/${fileKey}?depth=2`);
  const canvas = data.document.children?.find((c) => c.type === "CANVAS");
  const ids = (canvas?.children ?? []).filter((c) => FRAME_TYPES.has(c.type) && c.visible !== false).map((c) => c.id);
  return { ids: ids.slice(0, MAX_FRAMES), fileName: data.name };
}

export interface FigmaFrame {
  id: string;
  name: string;
  node: FigmaNode;
  /** Förhandsbild som Figma tillfälligt hostar, eller null om den inte gick att skapa. */
  imageUrl: string | null;
}

export async function loadFrames(fileKey: string, nodeId: string | null): Promise<{ fileName: string; frames: FigmaFrame[] }> {
  const { ids, fileName } = await frameIds(fileKey, nodeId);
  if (ids.length === 0) throw new FigmaError("FIGMA_NO_FRAMES");
  const query = encodeURIComponent(ids.join(","));
  const [nodes, images] = await Promise.all([
    figma<{ nodes: Record<string, { document: FigmaNode } | null> }>(`/v1/files/${fileKey}/nodes?ids=${query}`),
    // En bild som inte går att skapa ska inte fälla mätningen.
    figma<{ images: Record<string, string | null> }>(`/v1/images/${fileKey}?ids=${query}&format=png&scale=1`).catch(() => ({ images: {} as Record<string, string | null> })),
  ]);
  const frames = ids.flatMap((id): FigmaFrame[] => {
    const node = nodes.nodes[id]?.document;
    if (!node) return [];
    const img = images.images[id];
    return [{ id, name: node.name, node, imageUrl: typeof img === "string" && img.startsWith("https://") ? img : null }];
  });
  if (frames.length === 0) throw new FigmaError("FIGMA_NOT_FOUND");
  return { fileName, frames };
}
