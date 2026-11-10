import type { AdFormat } from "./layout";

/**
 * ArtCraft (Storyteller) Omni API: bildgenerering (steg 7). Anropen går bara
 * från servern, nyckeln ligger i ARTCRAFT_API_KEY (Vercel) och lämnar aldrig
 * servern. Dokumentationen: github.com/storytold/artcraft-services,
 * _docs/omni_api. Generering är asynkron: start ger ett jobb-id som sedan
 * frågas om tills det är klart, och bilden hämtas från media_links.cdn_url.
 */

const DEFAULT_BASE = "https://api.storyteller.ai";
/**
 * Bara för tester mot en falsk ArtCraft-server: sätts aldrig i Vercel. Adressen
 * (och bara den) godtas då också som källa för bilder, se isAllowedCdnUrl.
 */
const base = () => process.env.ARTCRAFT_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_BASE;
/** nano_banana_2 kostar cirka 8 US cent per bild i 1K (källa: artcraft_router, cost.rs). */
export const ARTCRAFT_MODEL = "nano_banana_2";
const TIMEOUT_MS = 30_000;

export const ARTCRAFT_ASPECT: Record<AdFormat, string> = {
  "1:1": "square",
  "4:5": "tall_four_by_five",
  "9:16": "tall_nine_by_sixteen",
};

/** AI:n renderar aldrig text i bilden: texten läggs på av koden (compose.ts). */
const NO_TEXT = " No text, no letters, no logos, no watermarks anywhere in the image.";

export const JOB_TOKEN = /^jinf_[a-z0-9]{10,60}$/;

export type ArtcraftError = "ARTCRAFT_DISABLED" | "ARTCRAFT_AUTH" | "ARTCRAFT_PAYMENT" | "ARTCRAFT_REJECTED" | "ARTCRAFT_FAILED";

const key = () => process.env.ARTCRAFT_API_KEY?.trim() ?? "";
export const artcraftEnabled = () => key().length > 0;

const errorOf = (status: number): ArtcraftError =>
  status === 401 || status === 403 ? "ARTCRAFT_AUTH" : status === 402 ? "ARTCRAFT_PAYMENT" : status === 400 || status === 422 ? "ARTCRAFT_REJECTED" : "ARTCRAFT_FAILED";

async function call(path: string, init: RequestInit): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; error: ArtcraftError }> {
  if (!artcraftEnabled()) return { ok: false, error: "ARTCRAFT_DISABLED" };
  try {
    const res = await fetch(`${base()}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${key()}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      // Aldrig nyckeln i loggen: bara status och början av svaret.
      console.error(`artcraft ${init.method ?? "GET"} ${path.replace(/jinf_\w+/, "jinf_…")} ${res.status} ${text.slice(0, 200)}`);
      return { ok: false, error: errorOf(res.status) };
    }
    return { ok: true, json: JSON.parse(text) as Record<string, unknown> };
  } catch (err) {
    console.error("artcraft anrop misslyckades", err instanceof Error ? err.message : err);
    return { ok: false, error: "ARTCRAFT_FAILED" };
  }
}

/** Startar ett bildjobb. Returnerar jobb-id:t. En bild, 1K, vald modell. */
export async function startImage(prompt: string, format: AdFormat): Promise<{ token: string } | { error: ArtcraftError }> {
  const r = await call("/v1/omni_api/generate/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ARTCRAFT_MODEL,
      prompt: `${prompt.trim()}.${NO_TEXT}`,
      aspect_ratio: ARTCRAFT_ASPECT[format],
      resolution: "one_k",
      image_batch_count: 1,
      idempotency_token: crypto.randomUUID(),
    }),
  });
  if (!r.ok) return { error: r.error };
  const token = r.json.inference_job_token;
  return typeof token === "string" && JOB_TOKEN.test(token) ? { token } : { error: "ARTCRAFT_FAILED" };
}

export type JobState =
  | { state: "running"; progress: number }
  | { state: "done"; cdnUrl: string }
  | { state: "failed" };

const FAILED = new Set(["complete_failure", "dead", "cancelled_by_user", "cancelled_by_system"]);

/** Var jobbet står. attempt_failed betyder att ArtCraft försöker igen, så det räknas som pågående. */
export async function jobState(token: string): Promise<JobState | { error: ArtcraftError }> {
  const r = await call(`/v1/omni_api/job_status/job/${token}`, { method: "GET" });
  if (!r.ok) return { error: r.error };
  const state = r.json.state as { status?: { status?: string; progress_percentage?: number }; maybe_result?: { media_links?: { cdn_url?: string } } } | undefined;
  const status = state?.status?.status ?? "";
  if (status === "complete_success") {
    const cdnUrl = state?.maybe_result?.media_links?.cdn_url;
    return typeof cdnUrl === "string" ? { state: "done", cdnUrl } : { state: "failed" };
  }
  if (FAILED.has(status)) return { state: "failed" };
  const p = state?.status?.progress_percentage;
  return { state: "running", progress: typeof p === "number" && p >= 0 && p <= 100 ? Math.round(p) : 0 };
}

/** Värdar som en ArtCraft-bild får hämtas från. Allt annat avvisas, så ett manipulerat svar inte får oss att hämta något annat. */
const CDN_HOSTS = [/\.r2\.dev$/, /(^|\.)fakeyou\.com$/, /(^|\.)storyteller\.ai$/, /(^|\.)getartcraft\.com$/];

export function isAllowedCdnUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (process.env.ARTCRAFT_BASE_URL && u.origin === new URL(base()).origin) return true;
    return u.protocol === "https:" && !u.username && !u.password && (u.port === "" || u.port === "443") && CDN_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/** Hämtar den färdiga bilden. Följer inga omdirigeringar och stannar vid `maxBytes`. */
export async function downloadImage(url: string, maxBytes: number): Promise<Buffer | "TOO_LARGE" | null> {
  if (!isAllowedCdnUrl(url)) return null;
  try {
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok || !res.body) return null;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes) return "TOO_LARGE";
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        return "TOO_LARGE";
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

/** Bredd och höjd ur en PNG:s huvud, annars null. */
export function pngSize(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 24 || b[12] !== 0x49 || b[13] !== 0x48 || b[14] !== 0x44 || b[15] !== 0x52) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const width = v.getUint32(16), height = v.getUint32(20);
  return width > 0 && height > 0 && width < 100_000 && height < 100_000 ? { width, height } : null;
}
