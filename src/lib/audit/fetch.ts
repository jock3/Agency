import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import zlib from "node:zlib";

/**
 * Hämtning av en godtycklig, besökarvald URL från vår server. Det är en klassisk
 * SSRF-yta, så varje anslutning går via en egen DNS-uppslagning som vägrar
 * privata, lokala och reserverade adresser. Kontrollen sitter i `lookup` på
 * själva socketen — inte i ett separat förhandsanrop — så en värd som byter
 * adress mellan kontroll och anslutning (DNS rebinding) fångas ändå.
 */

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const USER_AGENT = "MilouAudit/1.0 (+https://milou.se)";

export class FetchError extends Error {
  constructor(public code: "INVALID_URL" | "BLOCKED_HOST" | "TIMEOUT" | "TOO_LARGE" | "NETWORK" | "TOO_MANY_REDIRECTS") {
    super(code);
  }
}

export interface FetchResult {
  url: string;
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  ms: number;
}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isBlockedAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const n = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    // IPv4-mappade adresser (::ffff:10.0.0.1) prövas som IPv4.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("ff") ||
      lower.startsWith("2001:db8") ||
      lower.startsWith("64:ff9b")
    );
  }
  return true;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function safeLookup(hostname: string, options: object, callback: LookupCallback) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return callback(Object.assign(new Error("BLOCKED_HOST"), { code: "BLOCKED_HOST" }), "");
    }
    const opts = options as { all?: boolean };
    if (opts.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

/** Tolkar besökarens inmatning. "exempel.se" blir https://exempel.se/. */
export function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2000) throw new FetchError("INVALID_URL");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new FetchError("INVALID_URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchError("INVALID_URL");
  if (url.username || url.password) throw new FetchError("INVALID_URL");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchError("INVALID_URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  // IP-adresser direkt i URL:en går inte via DNS och prövas därför här.
  if (isIP(host) && isBlockedAddress(host)) throw new FetchError("BLOCKED_HOST");
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchError("INVALID_URL");
  }
  url.hash = "";
  return url;
}

function requestOnce(url: URL, signal: AbortSignal): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup: safeLookup as never,
        signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "sv,en;q=0.8",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            reject(new FetchError("TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      },
    );
    req.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "BLOCKED_HOST") reject(new FetchError("BLOCKED_HOST"));
      else if (err.name === "AbortError") reject(new FetchError("TIMEOUT"));
      else reject(new FetchError("NETWORK"));
    });
    req.end();
  });
}

function decode(body: Buffer, headers: http.IncomingHttpHeaders): string {
  const encoding = String(headers["content-encoding"] ?? "").toLowerCase();
  let raw = body;
  try {
    if (encoding.includes("br")) raw = zlib.brotliDecompressSync(body, { maxOutputLength: MAX_BYTES * 4 });
    else if (encoding.includes("gzip")) raw = zlib.gunzipSync(body, { maxOutputLength: MAX_BYTES * 4 });
    else if (encoding.includes("deflate")) raw = zlib.inflateSync(body, { maxOutputLength: MAX_BYTES * 4 });
  } catch {
    throw new FetchError("TOO_LARGE");
  }
  const charset = String(headers["content-type"] ?? "").match(/charset=([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(raw);
  } catch {
    return new TextDecoder("utf-8").decode(raw);
  }
}

/** Följer omdirigeringar manuellt så varje hopp går genom samma kontroller. */
export async function safeFetch(start: URL, timeoutMs = TIMEOUT_MS): Promise<FetchResult> {
  const began = Date.now();
  const signal = AbortSignal.timeout(timeoutMs);
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(url, signal);
    const location = res.headers.location;
    if (res.status >= 300 && res.status < 400 && location) {
      url = normalizeUrl(new URL(location, url).toString());
      continue;
    }
    return { url: url.toString(), status: res.status, headers: res.headers, body: decode(res.body, res.headers), ms: Date.now() - began };
  }
  throw new FetchError("TOO_MANY_REDIRECTS");
}

/** För robots.txt, sitemap och llms.txt: ett fel betyder bara "finns inte". */
export async function tryFetch(url: URL, timeoutMs = TIMEOUT_MS): Promise<FetchResult | null> {
  try {
    const res = await safeFetch(url, timeoutMs);
    return res.status >= 200 && res.status < 300 ? res : null;
  } catch {
    return null;
  }
}
