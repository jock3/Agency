// @vitest-environment jsdom
/**
 * Mediaplanens tre steg i en simulerad webbläsare, med påhittad data.
 * Med MEDIAPLAN_SHOTS=1 sparas även skärmbilder av stegen på skrivbordet
 * (kräver ett färskt bygge för Tailwind-stilarna och Chrome på datorn).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { rollup } from "@/lib/mediaplan/hierarchy";
import type { MediaPlan } from "@/lib/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/mediaplan" }));
vi.mock("next/link", () => ({ default: ({ children, href, className }: { children: unknown; href: string; className?: string }) => createElement("a", { href, className }, children as never) }));
vi.mock("@/lib/api/plan-reports", () => ({ getPlanReportLinks: async () => ({ links: { c1: "r1" }, companies: [{ id: "co", name: "Milou" }] }) }));
vi.mock("@/lib/api/plans", () => ({ archivePlan: vi.fn(), deletePlan: vi.fn() }));
vi.mock("@/components/plan-overlay/PlanOverlay", () => ({ default: ({ planId }: { planId: string }) => createElement("div", { role: "dialog", "aria-label": `plan ${planId}` }) }));

const plan = (o: Partial<MediaPlan>): MediaPlan => ({
  id: "p", campaign_name: "Plan", period_start: "2026-06-01", period_end: "2026-08-31", archived: false, share_token: null, client_id: null,
  planned_budget: null, status: "active", tags: [], project_id: "pr1", kind: "campaign", plan_year: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...o,
});
const client = { id: "cl1", name: "Region Gotland", client_number: "G-001", archived: false, created_at: "", updated_at: "" };
const project = { id: "pr1", client_id: "cl1", name: "Vattenkampanj", archived: false, created_at: "", updated_at: "" };
const plans = [
  plan({ id: "y1", campaign_name: "Vattenkampanj 2026", kind: "year", plan_year: 2026, period_start: "2026-01-01", period_end: "2026-12-31", planned_budget: 400000, tags: ["Region Gotland", "Vattenkampanj"] }),
  plan({ id: "c1", campaign_name: "Sommarkampanj", planned_budget: 250000, tags: ["Region Gotland", "Vattenkampanj", "Sommarkampanj"] }),
  plan({ id: "c2", campaign_name: "Innerstad och hämttider", period_start: "2026-09-24", period_end: "2027-03-01", tags: ["Region Gotland", "Vattenkampanj"] }),
  plan({ id: "c3", campaign_name: "Vår 2027", period_start: "2027-03-01", period_end: "2027-05-31" }),
];

const api = {
  listClients: vi.fn(async () => ({
    clients: [
      { ...client, projects: 1, rollup: rollup(plans) },
      { id: "cl2", name: "Brovik Bageri", client_number: "BB-001", archived: false, created_at: "", updated_at: "", projects: 1, rollup: rollup([plans[1]]) },
      { id: "cl3", name: "PMalmö", client_number: "PM-001", archived: false, created_at: "", updated_at: "", projects: 1, rollup: rollup([]) },
    ],
    unsorted: 1,
  })),
  getClient: vi.fn(async () => ({
    client,
    projects: [
      { ...project, rollup: rollup(plans), years: [2026] },
      { id: "pr2", client_id: "cl1", name: "Varumärke", archived: false, created_at: "", updated_at: "", rollup: rollup([]), years: [] },
    ],
  })),
  getProject: vi.fn(async () => ({ client, project, plans })),
  createClient: vi.fn(async (i: { name: string }) => ({ ...client, id: "new", name: i.name })),
  createProject: vi.fn(),
  createProjectPlan: vi.fn(async () => plan({ id: "y27", kind: "year", plan_year: 2027 })),
  updateClient: vi.fn(), deleteClient: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(), listUnsortedPlans: vi.fn(async () => []), movePlan: vi.fn(),
};
vi.mock("@/lib/api/hierarchy", () => api);

beforeEach(() => { push.mockReset(); });
afterEach(() => cleanup());

describe("mediaplan i tre steg", () => {
  it("steg 1 visar kunderna med budget och skapar en ny kund", async () => {
    const user = userEvent.setup();
    const { default: Page } = await import("./page");
    render(<Page />);
    expect(await screen.findByText("Region Gotland")).toBeTruthy();
    expect(screen.getByText("Osorterade planer (1)")).toBeTruthy();
    expect(screen.getAllByText(/Planerad budget 650 000 kr/).length).toBe(1);
    await user.type(screen.getByLabelText("Sök kund"), "bb-0");
    expect(screen.queryByText("Region Gotland")).toBeNull();
    expect(screen.getByText("Brovik Bageri")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "+ Ny kund" }));
    await user.type(screen.getByLabelText("Kundens namn"), "Solbacka");
    await user.click(screen.getByRole("button", { name: "Skapa kund" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/mediaplan/kund/new"));
    expect(api.createClient).toHaveBeenCalledWith({ name: "Solbacka", clientNumber: "" });
  });

  it("steg 2 visar kundens projekt med länkar till steg 3", async () => {
    const { default: ClientStep } = await import("./kund/[id]/ClientStep");
    render(<ClientStep id="cl1" />);
    const link = (await screen.findByText("Vattenkampanj")).closest("a");
    expect(link?.getAttribute("href")).toBe("/mediaplan/projekt/pr1");
    expect(screen.getByText("Årsplaner: 2026")).toBeTruthy();
  });

  it("steg 3 visar årskalender och kampanjer per år", async () => {
    const user = userEvent.setup();
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: /Årsplan/ });
    await user.click(screen.getByRole("button", { name: "2026" }));
    const camp = screen.getByRole("region", { name: "Kampanjer 2026" });
    expect(within(camp).getByRole("button", { name: "Sommarkampanj" })).toBeTruthy();
    expect(within(camp).getByRole("button", { name: "Innerstad och hämttider" })).toBeTruthy();
    expect(within(camp).queryByText("Vår 2027")).toBeNull();
    const cal = screen.getByRole("group", { name: "Årskalender 2026" });
    expect(within(cal).getByRole("button", { name: "Sommarkampanj, 1/6–31/8" })).toBeTruthy();
    expect(within(cal).getByRole("button", { name: "Innerstad och hämttider, 24/9–1/3 (pågår över årsskiftet)" })).toBeTruthy();
    expect(within(cal).queryByRole("button", { name: /Vår 2027/ })).toBeNull();
    expect(within(camp).getByRole("button", { name: "Se rapport" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "2027" }));
    const camp27 = screen.getByRole("region", { name: "Kampanjer 2027" });
    expect(within(camp27).getByRole("button", { name: "Innerstad och hämttider" })).toBeTruthy();
    expect(within(camp27).getByRole("button", { name: "Vår 2027" })).toBeTruthy();
    // Årsplanen är en kalender med ett block per kampanj; klick öppnar kampanjens plan.
    const cal27 = screen.getByRole("group", { name: "Årskalender 2027" });
    await user.click(within(cal27).getByRole("button", { name: /^Vår 2027/ }));
    expect(await screen.findByRole("dialog", { name: "plan c3" })).toBeTruthy();
  });
});

describe.skipIf(!process.env.MEDIAPLAN_SHOTS)("skärmbilder", () => {
  it("steg 1–3", async () => {
    const { default: puppeteer } = await import("puppeteer-core");
    const cssDir = path.resolve(__dirname, "../../../.next/static/chunks");
    const tailwind = fs.readdirSync(cssDir).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(cssDir, f), "utf8")).join("\n");
    const pages: [string, () => Promise<React.ReactElement>, string][] = [
      ["1-kunder", async () => { const { default: P } = await import("./page"); return <P />; }, "Region Gotland"],
      ["2-projekt", async () => { const { default: P } = await import("./kund/[id]/ClientStep"); return <P id="cl1" />; }, "Varumärke"],
      ["3-planer", async () => { const { default: P } = await import("./projekt/[id]/ProjectStep"); return <P id="pr1" />; }, "Sommarkampanj"],
    ];
    const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    try {
      for (const [name, el, waitText] of pages) {
        const { container } = render(await el());
        await screen.findAllByText(waitText);
        await new Promise((r) => setTimeout(r, 50));
        const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><style>${tailwind}</style></head><body><div class="h-14 bg-gray-900 text-white flex items-center px-6 font-bold">AI-Labb · Mediaplan</div>${container.innerHTML}</body></html>`;
        cleanup();
        const p = await browser.newPage();
        await p.setViewport({ width: 1440, height: 900 });
        await p.setContent(html, { waitUntil: "load" });
        await p.screenshot({ path: path.join(os.homedir(), "Desktop", `mediaplan-steg-${name}.png`) as `${string}.png`, fullPage: true });
        await p.close();
      }
    } finally {
      await browser.close();
    }
  }, 60000);
});
