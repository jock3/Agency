/**
 * Skärmbilder av editorn med exempeldata, bred och smal vy. Körs bara på begäran:
 *   EDITOR_SHOTS=1 npx vitest run scripts/editor-shots.test.tsx
 * Kräver ett färskt bygge (.next/static) för Tailwind-stilarna och Chrome på datorn.
 * Bilderna hamnar på skrivbordet och visar exempeldata, inte riktiga rapporter.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import puppeteer from "puppeteer-core";
import { describe, expect, it, vi } from "vitest";
import { FONT_LINK, PAGE_CSS } from "@/lib/report/css";
import { sampleDoc } from "@/lib/report/sample";
import { testLogos } from "./test-png";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: unknown; href: string }) => createElement("a", { href }, children as never) }));

describe.skipIf(!process.env.EDITOR_SHOTS)("skärmbilder av editorn", () => {
  it("bred och smal vy", async () => {
    const { default: ReportEditor } = await import("@/components/report/ReportEditor");
    const doc = { ...sampleDoc(), logos: testLogos() };
    const cssDir = path.resolve(__dirname, "../.next/static/chunks");
    const tailwind = fs.readdirSync(cssDir).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(cssDir, f), "utf8")).join("\n");
    const html = renderToString(createElement(ReportEditor, { id: "x", initial: doc }));
    const page = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><link href="${FONT_LINK}" rel="stylesheet"><style>${tailwind}${PAGE_CSS}</style></head><body class="min-h-screen flex flex-col"><div class="h-14 bg-gray-900 text-white flex items-center px-6 font-bold">AI-Labb · Mediaplan</div><div class="h-9 bg-white border-b border-gray-200 px-4 flex items-center text-xs font-bold gap-3"><span class="bg-peach px-3 py-1">Mediaplaner</span><span class="text-gray-600">Rapport</span></div>${html}</body></html>`;
    const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    try {
      for (const [name, w, h, full] of [["bred", 1440, 900, false], ["smal", 800, 1000, true]] as const) {
        const p = await browser.newPage();
        await p.setViewport({ width: w, height: h });
        await p.setContent(page, { waitUntil: "load" });
        await p.evaluate("document.fonts.ready");
        const out = path.join(os.homedir(), "Desktop", `rapport-editor-${name}.png`);
        await p.screenshot({ path: out as `${string}.png`, fullPage: full });
        expect(fs.existsSync(out)).toBe(true);
        await p.close();
      }
    } finally {
      await browser.close();
    }
  }, 60000);
});
