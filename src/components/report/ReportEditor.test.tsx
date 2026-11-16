import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { sampleDoc } from "@/lib/report/sample";
import { blankDoc } from "@/lib/report/doc";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: unknown; href: string }) => createElement("a", { href }, children as never) }));

describe("ReportEditor (serverrendering)", () => {
  it("renderar exempelrapporten med sidlista, förhandsvisning och panel", async () => {
    const { default: ReportEditor } = await import("./ReportEditor");
    const html = renderToString(createElement(ReportEditor, { id: "x", initial: sampleDoc() }));
    expect(html).toContain("Sida 1: Startsida");
    expect(html).toContain("Sida 3: Statistik · Kännedomskampanj");
    expect(html).toContain("Solbacka Camping");
    expect(html).toContain("Sparat");
  });

  it("renderar en ny tom rapport", async () => {
    const { default: ReportEditor } = await import("./ReportEditor");
    const html = renderToString(createElement(ReportEditor, { id: "x", initial: blankDoc("Kund", "Kampanj") }));
    expect(html).toContain("Sida 1: Startsida");
  });

  it("renderar en rapport utan sidor", async () => {
    const { default: ReportEditor } = await import("./ReportEditor");
    const doc = blankDoc();
    doc.sections = [];
    const html = renderToString(createElement(ReportEditor, { id: "x", initial: doc }));
    expect(html).toContain("Rapporten är tom");
  });
});
