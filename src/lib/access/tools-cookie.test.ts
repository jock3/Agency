import { describe, expect, it } from "vitest";
import { HIDDEN_TOOLS_COOKIE, parseHiddenTools, sanitizeHiddenTools } from "./tools";

describe("verktygsväljarens kaka läses som den skrivs", () => {
  it("skrivs med encodeURIComponent och läses tillbaka oförändrat", () => {
    const next = ["formatkoll", "social"];
    const written = `${HIDDEN_TOOLS_COOKIE}=${encodeURIComponent(next.join(","))}`;
    const value = written.split("=")[1];
    expect(parseHiddenTools(value)).toEqual(next);
  });
});

describe("sanitizeHiddenTools", () => {
  it("tar emot en lista med giltiga verktyg och tar bort dubbletter", () => {
    expect(sanitizeHiddenTools(["social", "todo", "social"])).toEqual(["social", "todo"]);
    expect(sanitizeHiddenTools([])).toEqual([]);
  });
  it("nekar allt som inte är en lista med giltiga verktyg", () => {
    expect(sanitizeHiddenTools(["social", "hacker"])).toBeNull();
    expect(sanitizeHiddenTools("social")).toBeNull();
    expect(sanitizeHiddenTools(undefined)).toBeNull();
  });
});
