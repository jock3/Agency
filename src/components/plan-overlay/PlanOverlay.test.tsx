// @vitest-environment jsdom
/**
 * Kampanjens mediaplan i en simulerad webbläsare: handoffens exempel (Julbak 16 nov – 24 dec 2026,
 * budget 240 000 kr, dagens datum 17 nov). Med MEDIAPLAN_SHOTS=1 sparas även en skärmbild på
 * skrivbordet (kräver ett färskt bygge och Chrome på datorn).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import type { FullMediaPlan, MediaLine } from "@/lib/types";

vi.mock("next/link", () => ({ default: ({ children, href, className }: { children: unknown; href: string; className?: string }) => createElement("a", { href, className }, children as never) }));

const line = (o: Partial<MediaLine>): MediaLine => ({
  id: "l", category_id: "c1", platform_name: "Meta", cost_per_unit: 0, unit_type: "per månad", quantity: 1, campaign_mapping: null, color: "#000",
  start_date: "2026-11-16", end_date: "2026-12-24", sort_order: 0, deadline_date: null, deadline_label: null, estimated_reach: null, ...o,
});
const base = (): FullMediaPlan => ({
  id: "julbak", campaign_name: "Brovik Bageri: Julbak 2026", period_start: "2026-11-16", period_end: "2026-12-24", archived: false, share_token: null,
  client_id: "BB-001", planned_budget: 240000, status: "approved", tags: ["Brovik Bageri", "Jul 2026"], project_id: "pr1", kind: "campaign", plan_year: null,
  created_at: "2026-10-28T09:00:00Z", updated_at: "", concepts: [], deadlines: [],
  categories: [
    { id: "c1", plan_id: "julbak", name: "Sociala medier", budget: null, color: "#E60330", sort_order: 0, section: "social", lines: [
      line({ id: "meta", platform_name: "Meta", cost_per_unit: 100, quantity: 1 }),
      line({ id: "tiktok", platform_name: "TikTok", start_date: "2026-11-30", end_date: "2026-12-20", sort_order: 1 }),
    ] },
    { id: "c2", plan_id: "julbak", name: "Extern media", budget: null, color: "#931644", sort_order: 1, section: "extern", lines: [
      line({ id: "tidning", category_id: "c2", platform_name: "Tidning", unit_type: "Helsida", estimated_reach: 12000 }),
    ] },
  ],
});

let current = base();
const api = {
  plans: {
    getFullPlan: vi.fn(async () => structuredClone(current)),
    updatePlan: vi.fn(async () => {}),
    generateShareToken: vi.fn(async () => "abc123"),
  },
  lines: { updateLine: vi.fn(async () => {}), createLine: vi.fn(), deleteLine: vi.fn(async () => {}), reorderLines: vi.fn(async () => {}), addChannelLine: vi.fn(async () => {}) },
};
vi.mock("@/lib/api/plans", () => api.plans);
vi.mock("@/lib/api/lines", () => api.lines);
vi.mock("@/lib/api/categories", () => ({ updateCategory: vi.fn(), createCategory: vi.fn(), deleteCategory: vi.fn() }));
vi.mock("@/lib/api/concepts", () => ({ updateConcept: vi.fn(), deleteConcept: vi.fn() }));
vi.mock("@/lib/api/deadlines", () => ({ createDeadline: vi.fn(), updateDeadline: vi.fn(), deleteDeadline: vi.fn() }));
vi.mock("@/lib/api/hierarchy", () => ({ getPlanContext: async () => ({ client: { id: "cl1", name: "Brovik Bageri", client_number: "BB-001" }, project: { id: "pr1", name: "Jul 2026", pattern_round: 0 } }) }));

beforeEach(() => {
  current = base();
  Object.values(api.plans).forEach((f) => f.mockClear());
  Object.values(api.lines).forEach((f) => f.mockClear());
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T12:00:00+01:00"));
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const open = async () => {
  const { default: PlanOverlay } = await import("./PlanOverlay");
  const onClose = vi.fn();
  render(<PlanOverlay planId="julbak" onClose={onClose} />);
  await screen.findByRole("heading", { name: "Kanaler och veckor" });
  return { onClose };
};
const hero = () => screen.getByRole("heading", { level: 1 }).closest("section")!;
const stat = (label: string) => within(hero()).getByText(label, { selector: "dt" }).closest("div")!;
const txt = (el: Element) => (el.textContent ?? "").replace(/[\u00a0\u202f]/g, " ");

describe("rubrik och nyckeltal", () => {
  it("namn, status, nedräkning, period och brödsmulor", async () => {
    await open();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Brovik Bageri: Julbak 2026");
    expect(within(hero()).getByText("Godkänd")).toBeTruthy();
    expect(within(hero()).getByText("Pågår · 37 dagar kvar")).toBeTruthy();
    expect(within(hero()).getByText(/16 nov 2026 – 24 dec 2026 · 39 dagar/)).toBeTruthy();
    const crumbs = within(screen.getByRole("navigation", { name: "Brödsmulor" }));
    expect(crumbs.getByRole("link", { name: "Brovik Bageri" }).getAttribute("href")).toBe("/mediaplan/kund/cl1");
    expect(crumbs.getByRole("link", { name: "Jul 2026" }).getAttribute("href")).toBe("/mediaplan/projekt/pr1");
  });

  it("Bokat 100 kr, budget 240 000 kr, kvar 239 900 kr, räckvidd, och mätaren", async () => {
    await open();
    expect(txt(stat("Bokat"))).toBe("Bokat100 kr");
    expect((within(stat("Planerad budget")).getByLabelText("Planerad budget") as HTMLInputElement).value).toBe("240 000");
    expect(txt(stat("Kvar av budget"))).toContain("239 900 kr");
    expect(txt(stat("Räckvidd"))).toContain("12 000");
    expect(within(hero()).getByText("0,04 % av den planerade budgeten är bokad")).toBeTruthy();
  });

  it("kostnaden räknas om direkt när à-pris ändras, och sparas på raden", async () => {
    const user = userEvent.setup();
    await open();
    const price = screen.getByLabelText("À-pris för TikTok");
    await user.click(price);
    await user.type(price, "1 500,5");
    await user.tab();
    expect(api.lines.updateLine).toHaveBeenCalledWith("tiktok", { cost_per_unit: 1500.5 });
    expect(txt(stat("Bokat"))).toContain("1 601 kr"); // 100 + 1 500,5 avrundat
    expect((price as HTMLInputElement).value).toBe("1 500,5");
  });

  it("ogiltigt värde får röd ram och sparas inte", async () => {
    const user = userEvent.setup();
    await open();
    const qty = screen.getByLabelText("Antal för Meta");
    await user.click(qty);
    await user.type(qty, "x");
    expect(qty.getAttribute("aria-invalid")).toBe("true");
    await user.tab();
    expect(api.lines.updateLine).not.toHaveBeenCalled();
  });

  it("över budget visas som 'Över budget' och mätaren fylls", async () => {
    current.planned_budget = 50;
    await open();
    expect(txt(stat("Över budget"))).toContain("50 kr");
    expect(within(hero()).getByText("200 % av den planerade budgeten är bokad")).toBeTruthy();
  });

  it("utan budget visas – och en uppmaning", async () => {
    current.planned_budget = null;
    await open();
    expect(stat("Kvar av budget").textContent).toContain("–");
    expect(within(hero()).getByText(/Ange en planerad budget/)).toBeTruthy();
  });

  it("planerad budget kan ändras", async () => {
    const user = userEvent.setup();
    await open();
    const field = within(stat("Planerad budget")).getByLabelText("Planerad budget");
    await user.clear(field);
    await user.type(field, "300000");
    await user.tab();
    expect(api.plans.updatePlan).toHaveBeenCalledWith("julbak", { planned_budget: 300000 });
    expect(txt(stat("Kvar av budget"))).toContain("299 900 kr");
  });
});

describe("tabell", () => {
  it("veckor v.47–52 med datum och den här veckan markerad, idag-linje och totalrad", async () => {
    await open();
    for (const w of ["v.47", "v.48", "v.49", "v.50", "v.51", "v.52"]) expect(screen.getByText(w)).toBeTruthy();
    expect(screen.getByText("30 nov–6 dec")).toBeTruthy();
    expect(screen.getByText("Idag 17 nov")).toBeTruthy();
    expect(screen.getByText("November 2026")).toBeTruthy();
    expect(screen.getByText("December 2026")).toBeTruthy();
    expect(screen.getByText("Totalt")).toBeTruthy();
  });

  it("sektioner med antal och delsumma, och stapeltext efter pris", async () => {
    await open();
    expect(screen.getByText("2 kanaler")).toBeTruthy();
    expect(screen.getByText("1 kanal")).toBeTruthy();
    expect(screen.getByTitle("Meta: v.47 – v.52").textContent).toBe("v.47–52 · 100 kr");
    expect(screen.getByTitle("TikTok: v.49 – v.51").textContent).toBe("v.49–51 · inget pris");
  });

  it("randig stapel för rad utan pris, och Lägg till plattform finns", async () => {
    await open();
    expect(screen.getByRole("button", { name: /Lägg till plattform/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Lägg till kanal/ })).toBeTruthy();
    expect(screen.getByTitle("TikTok: v.49 – v.51").style.background).toContain("repeating-linear-gradient");
  });

  it("räckvidd kan sparas på en rad, och tomt fält tar bort den", async () => {
    const user = userEvent.setup();
    await open();
    const reach = screen.getByLabelText("Räckvidd för Tidning");
    await user.clear(reach);
    await user.tab();
    expect(api.lines.updateLine).toHaveBeenCalledWith("tidning", { estimated_reach: null });
  });

  it("enhet kan bytas och rad kan tas bort", async () => {
    const user = userEvent.setup();
    await open();
    fireEvent.change(screen.getByLabelText("Enhet för Tidning"), { target: { value: "Halvsida" } });
    expect(api.lines.updateLine).toHaveBeenCalledWith("tidning", { unit_type: "Halvsida" });
    await user.click(screen.getByRole("button", { name: "Ta bort TikTok" }));
    expect(api.lines.deleteLine).toHaveBeenCalledWith("tiktok");
  });
});

describe("inställningar och knappar", () => {
  it("period, status, kund-ID och namn sparas", async () => {
    const user = userEvent.setup();
    await open();
    fireEvent.change(screen.getByLabelText("till"), { target: { value: "2026-12-31" } });
    expect(api.plans.updatePlan).toHaveBeenCalledWith("julbak", { period_end: "2026-12-31" });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "draft" } });
    expect(api.plans.updatePlan).toHaveBeenCalledWith("julbak", { status: "draft" });
    const id = screen.getByLabelText("Kund-ID");
    await user.clear(id);
    await user.type(id, "BB-002");
    await user.tab();
    expect(api.plans.updatePlan).toHaveBeenCalledWith("julbak", { client_id: "BB-002" });
    await user.click(screen.getByRole("button", { name: "Brovik Bageri: Julbak 2026" }));
    const name = screen.getByLabelText("Kampanjens namn");
    await user.clear(name);
    await user.type(name, "Julbak{Enter}");
    expect(api.plans.updatePlan).toHaveBeenCalledWith("julbak", { campaign_name: "Julbak" });
  });

  it("Kopiera kundlänk skapar länk och kopierar den, och Esc stänger fönstret", async () => {
    const user = userEvent.setup();
    const copy = vi.spyOn(navigator.clipboard, "writeText");
    const { onClose } = await open();
    await user.click(screen.getByRole("button", { name: /Kopiera kundlänk/ }));
    await waitFor(() => expect(screen.getByText("Länken är kopierad")).toBeTruthy());
    expect(copy).toHaveBeenCalledWith(`${window.location.origin}/share/abc123`);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Alla kampanjer i Jul 2026" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("knappar och flikar är markerade så att bildexporten hoppar över dem", async () => {
    await open();
    expect(screen.getByRole("button", { name: /Exportera bild/ }).parentElement!.hasAttribute("data-html2canvas-ignore")).toBe(true);
    expect(screen.getByRole("navigation", { name: "Vy" }).hasAttribute("data-html2canvas-ignore")).toBe(true);
    expect(screen.getByRole("region", { name: "Kampanjinställningar" }).hasAttribute("data-html2canvas-ignore")).toBe(true);
  });
});

describe.skipIf(!process.env.MEDIAPLAN_SHOTS)("skärmbild", () => {
  it("kampanjens mediaplan på desktop och mobil", async () => {
    const { default: puppeteer } = await import("puppeteer-core");
    const cssDir = path.resolve(__dirname, "../../../.next/static/chunks");
    const tailwind = fs.readdirSync(cssDir).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(cssDir, f), "utf8")).join("\n");
    await open();
    await new Promise((r) => setTimeout(r, 80));
    const dialog = screen.getByRole("dialog");
    // Fönstret är fast positionerat och skrollar internt; släpp det för en helsidesbild.
    dialog.parentElement!.style.position = "static";
    dialog.classList.remove("h-full", "overflow-hidden");
    (dialog.querySelector(".overflow-y-auto") as HTMLElement).classList.remove("overflow-y-auto", "flex-1");
    const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link href="https://fonts.googleapis.com/css2?family=REM:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>${tailwind}body{font-family:'REM',system-ui,sans-serif;background:#F2F2F2;margin:0}.font-display{font-family:'REM',system-ui,sans-serif}</style></head><body><div style="height:56px;background:#1C1C1C;color:#fff;display:flex;align-items:center;padding:0 24px;font-weight:900">MILOU</div>${dialog.parentElement!.outerHTML}</body></html>`;
    const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    try {
      for (const [suffix, w, h] of [["", 1440, 900], ["-mobil", 390, 844]] as const) {
        const p = await browser.newPage();
        await p.setViewport({ width: w, height: h });
        await p.setContent(html, { waitUntil: "load" });
        await p.evaluate("document.fonts.ready");
        await p.screenshot({ path: path.join(os.homedir(), "Desktop", `mediaplan-steg-4-plan${suffix}.png`) as `${string}.png`, fullPage: true });
        await p.close();
      }
    } finally {
      await browser.close();
    }
  }, 90000);
});
