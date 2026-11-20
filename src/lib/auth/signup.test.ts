import { describe, expect, it } from "vitest";
import { fullNameOf } from "./session";

describe("fullNameOf", () => {
  it("slår ihop och städar för- och efternamn", () => {
    expect(fullNameOf("  Anna ", "Svensson-Öberg")).toBe("Anna Svensson-Öberg");
    expect(fullNameOf("Mary  Ann", "O'Neil")).toBe("Mary Ann O'Neil");
  });
  it("nekar tomt, siffror, tecken och för långt", () => {
    expect(fullNameOf("", "Svensson")).toBeNull();
    expect(fullNameOf("Anna", "  ")).toBeNull();
    expect(fullNameOf("Anna1", "Svensson")).toBeNull();
    expect(fullNameOf("<b>", "Svensson")).toBeNull();
    expect(fullNameOf("A".repeat(41), "Svensson")).toBeNull();
    expect(fullNameOf(undefined, "Svensson")).toBeNull();
  });
});
