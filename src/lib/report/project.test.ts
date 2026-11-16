import { describe, expect, it } from "vitest";
import { blankKeepingLogos, fileBase, parseProjectFile, withLogos } from "./project";
import { sampleDoc } from "./sample";

describe("projektfil", () => {
  it("filnamn utan tecken som inte går i filnamn", () => {
    const d = sampleDoc();
    d.meta.campaign = 'Sommar: "2026"/test';
    expect(fileBase(d)).toBe("Rapport Solbacka Camping Sommar 2026test");
    d.meta.client = "";
    d.meta.campaign = "";
    expect(fileBase(d)).toBe("Rapport");
  });

  it("en sparad rapport går att läsa in igen och blir densamma", () => {
    const d = sampleDoc();
    expect(parseProjectFile(JSON.stringify(d))).toEqual(d);
  });

  it("läser en fil från prototypen (egna id:n, saknade fält fylls i)", () => {
    const proto = { version: 1, meta: { client: "K" }, logos: { meta: "data:image/png;base64,AAAA" }, sections: [{ id: "x1", type: "stats", title: "T", kpis: ["ctr"], platforms: [{ id: "p1", name: "Meta", ads: [{ id: "a1", name: "A", values: { clicks: 5, impressions: 100 } }] }] }] };
    const d = parseProjectFile(JSON.stringify(proto))!;
    expect(d.meta).toMatchObject({ client: "K", campaign: "", agency: "" });
    expect(d.sections[0]).toMatchObject({ type: "stats", showAds: true });
    expect(d.logos.meta).toBeDefined();
  });

  it("avvisar filer som inte är rapporter", () => {
    expect(parseProjectFile("inte json")).toBeNull();
    expect(parseProjectFile("{}")).toBeNull();
    expect(parseProjectFile('{"sections":"nej"}')).toBeNull();
    expect(parseProjectFile("[]")).toBeNull();
  });

  it("logotyperna slås ihop vid inläsning och finns kvar i en ny tom rapport", () => {
    const cur = sampleDoc();
    cur.logos = { meta: "data:image/png;base64,AAAA", tiktok: "data:image/png;base64,BBBB" };
    const inc = sampleDoc();
    inc.logos = { meta: "data:image/png;base64,CCCC" };
    expect(withLogos(inc, cur).logos).toEqual({ meta: "data:image/png;base64,CCCC", tiktok: "data:image/png;base64,BBBB" });
    expect(blankKeepingLogos(cur).logos).toEqual(cur.logos);
    expect(blankKeepingLogos(cur).sections).toHaveLength(1);
  });
});
