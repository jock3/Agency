import { describe, expect, it } from "vitest";
import { isBlockedAddress, normalizeUrl, FetchError } from "./fetch";
import { score } from "./checks";
import type { Check } from "./types";

describe("auditen når inte interna adresser", () => {
  it.each(["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "0.0.0.0", "::1", "::ffff:10.0.0.1", "fd00::1"])(
    "blockerar %s",
    (ip) => expect(isBlockedAddress(ip)).toBe(true),
  );

  it.each(["8.8.8.8", "93.184.216.34"])("släpper igenom publik adress %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });

  it.each(["http://localhost/", "http://127.0.0.1/", "https://192.168.0.10/", "https://intern.local/", "https://[::1]/", "https://user:pw@milou.se/"])(
    "nekar URL %s före hämtning",
    (url) => expect(() => normalizeUrl(url)).toThrow(FetchError),
  );

  it("nekar onormala portar", () => {
    expect(() => normalizeUrl("https://milou.se:8443/")).toThrow(FetchError);
  });

  it("tolkar ren domän till https", () => {
    expect(normalizeUrl("milou.se").toString()).toBe("https://milou.se/");
  });
});

describe("betyget är detsamma varje gång", () => {
  const checks: Check[] = [
    { id: "a", group: "seo", label: "A", weight: 2, status: "pass", detail: "" },
    { id: "b", group: "seo", label: "B", weight: 1, status: "fail", detail: "" },
    { id: "c", group: "geo", label: "C", weight: 3, status: "warn", detail: "" },
  ] as Check[];

  it("samma indata ger samma resultat", () => {
    expect(score(checks)).toEqual(score([...checks]));
  });

  it("alla godkända ger 10", () => {
    const allPass = checks.map((c) => ({ ...c, status: "pass" as const }));
    expect(score(allPass).score).toBe(10);
  });

  it("ordningen på kontrollerna påverkar inte betyget", () => {
    expect(score(checks).score).toBe(score([...checks].reverse()).score);
  });
});
