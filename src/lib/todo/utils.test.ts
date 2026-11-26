import { describe, expect, it } from "vitest";
import { GROUP_COLORS } from "./constants";
import { textOn, textOnWhite } from "./utils";
import { ratioOf } from "@/lib/a11y/contrast";

describe("group colour text", () => {
  it("textOn reaches 4.5:1 on every group colour", () => {
    for (const c of GROUP_COLORS) expect(ratioOf(textOn(c), c)).toBeGreaterThanOrEqual(4.5);
  });

  it("uses dark text on orange and teal, white on dark", () => {
    expect(textOn("#FF582D")).not.toBe("#ffffff");
    expect(textOn("#3AA59C")).not.toBe("#ffffff");
    expect(textOn("#1a1a1a")).toBe("#ffffff");
  });

  it("textOnWhite reaches 4.5:1 on white for every group colour", () => {
    for (const c of GROUP_COLORS) expect(ratioOf(textOnWhite(c), "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});
