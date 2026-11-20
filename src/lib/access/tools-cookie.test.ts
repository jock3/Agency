import { describe, expect, it } from "vitest";
import { HIDDEN_TOOLS_COOKIE, parseHiddenTools } from "./tools";

describe("verktygsväljarens kaka läses som den skrivs", () => {
  it("skrivs med encodeURIComponent och läses tillbaka oförändrat", () => {
    const next = ["formatkoll", "social"];
    const written = `${HIDDEN_TOOLS_COOKIE}=${encodeURIComponent(next.join(","))}`;
    const value = written.split("=")[1];
    expect(parseHiddenTools(value)).toEqual(next);
  });
});
