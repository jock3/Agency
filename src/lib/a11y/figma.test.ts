import { afterEach, describe, expect, it, vi } from "vitest";
import { FigmaError, loadFrames } from "./figma";

const frame = { id: "1:2", name: "Start", type: "FRAME", children: [] };

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.FIGMA_TOKEN;
});

describe("loadFrames", () => {
  it("hämtar frame och bild med token, bara från api.figma.com", async () => {
    process.env.FIGMA_TOKEN = "t";
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string> }) => {
      calls.push(url);
      expect(init.headers["X-Figma-Token"]).toBe("t");
      const body = url.includes("/v1/images/") ? { images: { "1:2": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/x.png" } } : { name: "Fil", nodes: { "1:2": { document: frame } } };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const r = await loadFrames("AbCdEf1234567", "1:2");
    expect(r.frames[0].imageUrl).toMatch(/^https:/);
    expect(calls.every((u) => u.startsWith("https://api.figma.com/"))).toBe(true);
  });

  it("översätter 403 till FIGMA_NO_ACCESS", async () => {
    process.env.FIGMA_TOKEN = "t";
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 403 }));
    await expect(loadFrames("AbCdEf1234567", "1:2")).rejects.toMatchObject({ code: "FIGMA_NO_ACCESS" });
    await expect(loadFrames("AbCdEf1234567", "1:2")).rejects.toBeInstanceOf(FigmaError);
  });
});
