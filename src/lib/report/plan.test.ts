import { describe, expect, it } from "vitest";
import { cleanTags, planPeriod } from "./plan";

describe("planPeriod", () => {
  it("samma år visar året en gång", () => expect(planPeriod("2026-06-01", "2026-08-31")).toBe("1 jun – 31 aug 2026"));
  it("olika år visar båda", () => expect(planPeriod("2026-12-28", "2027-01-03")).toBe("28 dec 2026 – 3 jan 2027"));
  it("samma dag visas en gång", () => expect(planPeriod("2026-06-01", "2026-06-01")).toBe("1 jun 2026"));
  it("ogiltigt ger tomt", () => { expect(planPeriod("", "2026-06-01")).toBe(""); expect(planPeriod(null, undefined)).toBe(""); });
});

describe("cleanTags", () => {
  it("rensar tomma, dubbletter och icke-text", () => expect(cleanTags([" Sommar ", "", "Sommar", 3, "B2C"])).toEqual(["Sommar", "B2C"]));
  it("tål annat än listor", () => expect(cleanTags(null)).toEqual([]));
});
