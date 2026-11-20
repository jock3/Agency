import { describe, expect, it } from "vitest";
import { measure } from "./design";
import { parseFigmaUrl } from "./figma";
import type { FigmaNode } from "./figma";

const solid = (r: number, g: number, b: number) => [{ type: "SOLID", color: { r, g, b, a: 1 } }];
const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

const text = (id: string, fill: number, size = 16): FigmaNode => ({
  id,
  name: id,
  type: "TEXT",
  characters: "Hej",
  fills: solid(fill, fill, fill),
  style: { fontSize: size, fontWeight: 400 },
  absoluteBoundingBox: box(10, 10, 80, 20),
});

const frame = (children: FigmaNode[]): FigmaNode => ({
  id: "f",
  name: "Frame",
  type: "FRAME",
  fills: solid(1, 1, 1),
  absoluteBoundingBox: box(0, 0, 200, 200),
  children,
});

describe("parseFigmaUrl", () => {
  it("läser filnyckel och nod", () => {
    expect(parseFigmaUrl("https://www.figma.com/design/AbCdEf1234567/Namn?node-id=12-34")).toEqual({ fileKey: "AbCdEf1234567", nodeId: "12:34" });
    expect(parseFigmaUrl("https://figma.com/file/AbCdEf1234567/x")).toEqual({ fileKey: "AbCdEf1234567", nodeId: null });
  });
  it("nekar andra adresser", () => {
    expect(parseFigmaUrl("https://figma.com.evil.se/design/AbCdEf1234567/x")).toBeNull();
    expect(parseFigmaUrl("http://figma.com/design/AbCdEf1234567/x")).toBeNull();
    expect(parseFigmaUrl("https://example.com/design/AbCdEf1234567/x")).toBeNull();
    expect(parseFigmaUrl("inte en länk")).toBeNull();
  });
});

describe("measure", () => {
  it("flaggar grå text på vit bakgrund under 4,5:1 och föreslår en rättning", () => {
    const m = measure(frame([text("a", 0.7)]));
    expect(m.findings).toHaveLength(1);
    expect(m.findings[0].criterion).toBe("1.4.3");
    expect(m.findings[0].examples[0].fix).toMatch(/#/);
  });
  it("godkänner svart text på vit bakgrund", () => {
    expect(measure(frame([text("a", 0)])).findings).toHaveLength(0);
  });
  it("mäter inte text över toning, men räknar den som ej bedömd", () => {
    const grad: FigmaNode = { id: "g", name: "g", type: "RECTANGLE", fills: [{ type: "GRADIENT_LINEAR" }], absoluteBoundingBox: box(0, 0, 200, 200) };
    const m = measure(frame([grad, text("a", 0.7)]));
    expect(m.findings).toHaveLength(0);
    expect(m.unassessed).toBe(1);
  });
  it("hoppar över dolda lager", () => {
    expect(measure(frame([{ ...text("a", 0.7), visible: false }])).texts).toBe(0);
  });
  it("flaggar liten text och små knappar", () => {
    const btn: FigmaNode = { id: "b", name: "Button / Close", type: "INSTANCE", absoluteBoundingBox: box(0, 0, 16, 16) };
    const kinds = measure(frame([text("a", 0, 10), btn])).findings.map((f) => f.kind);
    expect(kinds).toEqual(expect.arrayContaining(["small-text", "target-size"]));
  });
});
