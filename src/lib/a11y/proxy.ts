import http from "node:http";
import net from "node:net";
import { isBlockedAddress, safeLookup } from "@/lib/audit/fetch";

/**
 * Webbläsaren i tillgänglighetsgranskningen laddar allt en kunds sida ber om:
 * skript, bilder, iframes, websockets. Det är samma SSRF-yta som
 * SEO-auditens hämtning, fast större. Därför startar Chrome med den här
 * proxyn som enda väg ut. Proxyn slår upp varje värd med safeLookup och
 * ansluter till exakt den kontrollerade adressen, så privata och lokala
 * adresser (och DNS rebinding) stoppas även för underresurser.
 */

const ALLOWED_PORTS = new Set([80, 443]);
const HOP_HEADERS = ["proxy-connection", "proxy-authorization", "connection", "keep-alive"];

const blockedLiteral = (host: string) => net.isIP(host) !== 0 && isBlockedAddress(host);

/** "värd:port" från CONNECT, med stöd för [IPv6]:port. */
function splitHostPort(authority: string): { host: string; port: number } | null {
  const m = authority.match(/^\[([^\]]+)\]:(\d+)$/) ?? authority.match(/^([^:]+):(\d+)$/);
  return m ? { host: m[1], port: Number(m[2]) } : null;
}

export interface SafeProxy {
  port: number;
  close: () => Promise<void>;
}

export function startSafeProxy(): Promise<SafeProxy> {
  const sockets = new Set<net.Socket>();
  const track = (s: net.Socket) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  };

  // Vanlig http: Chrome skickar hela URL:en i request-raden.
  const server = http.createServer((req, res) => {
    let target: URL;
    try {
      target = new URL(req.url ?? "");
    } catch {
      res.writeHead(400).end();
      return;
    }
    const port = Number(target.port || 80);
    const host = target.hostname.replace(/^\[|\]$/g, "");
    if (target.protocol !== "http:" || !ALLOWED_PORTS.has(port) || blockedLiteral(host)) {
      res.writeHead(403).end();
      return;
    }
    const headers = { ...req.headers };
    for (const h of HOP_HEADERS) delete headers[h];
    const upstream = http.request(
      { host, port, path: target.pathname + target.search, method: req.method, headers, lookup: safeLookup as never },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.setTimeout(15_000, () => upstream.destroy());
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  });

  // https och wss: en tunnel. TLS går hela vägen mellan Chrome och sajten.
  server.on("connect", (req: http.IncomingMessage, client: net.Socket, head: Buffer) => {
    track(client);
    const target = splitHostPort(req.url ?? "");
    if (!target || !ALLOWED_PORTS.has(target.port) || blockedLiteral(target.host)) {
      client.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }
    const upstream = net.connect({ host: target.host, port: target.port, lookup: safeLookup as never }, () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    track(upstream);
    upstream.setTimeout(30_000, () => upstream.destroy());
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
  });

  server.on("connection", track);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as net.AddressInfo;
      resolve({
        port: address.port,
        close: () =>
          new Promise<void>((done) => {
            for (const s of sockets) s.destroy();
            server.close(() => done());
          }),
      });
    });
  });
}
