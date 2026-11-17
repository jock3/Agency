// @vitest-environment jsdom
/**
 * Mediaplanens tre steg i en simulerad webbläsare, med handoffens exempeldata och
 * dagens datum satt till 17 nov 2026. Med MEDIAPLAN_SHOTS=1 sparas även skärmbilder
 * på skrivbordet (kräver ett färskt bygge för Tailwind-stilarna och Chrome på datorn).
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
vi.mock("next/link", () => ({ default: ({ children, href, className, ...rest }: { children: unknown; href: string; className?: string }) => createElement("a", { href, className, ...rest }, children as never) }));
vi.mock("@/lib/api/plan-reports", () => ({ getPlanReportLinks: async () => ({ links: { julbak: "r1" }, companies: [{ id: "co", name: "Milou" }] }) }));
vi.mock("@/lib/api/plans", () => ({ archivePlan: vi.fn(), deletePlan: vi.fn() }));
vi.mock("@/components/plan-overlay/PlanOverlay", () => ({ default: ({ planId }: { planId: string }) => createElement("div", { role: "dialog", "aria-label": `plan ${planId}` }) }));

const plan = (o: Partial<MediaPlan>): MediaPlan => ({
  id: "p", campaign_name: "Plan", period_start: "2026-06-01", period_end: "2026-08-31", archived: false, share_token: null, client_id: null,
  planned_budget: null, status: "draft", tags: [], project_id: "pr1", kind: "campaign", plan_year: null, created_at: "2026-11-17T09:00:00Z", updated_at: "", ...o,
});
const client = { id: "cl1", name: "Brovik Bageri", client_number: "BB-001", archived: false, created_at: "", updated_at: "" };
const project = { id: "pr1", client_id: "cl1", name: "Jul 2026", archived: false, pattern_round: 0, created_at: "", updated_at: "" };
const plans = [
  plan({ id: "test1", campaign_name: "Test1", period_start: "2026-01-01", period_end: "2026-02-08", tags: ["Brovik Bageri", "Jul 2026", "Test1"] }),
  plan({ id: "test2", campaign_name: "Test 2", period_start: "2026-02-01", period_end: "2026-04-30" }),
  plan({ id: "test3", campaign_name: "Test 3", period_start: "2026-03-01", period_end: "2026-12-31" }),
  plan({ id: "julbak", campaign_name: "Brovik Bageri: Julbak 2026", period_start: "2026-11-16", period_end: "2026-12-24", status: "approved", planned_budget: 240000, created_at: "2026-10-28T09:00:00Z" }),
];
const many = (n: number) => rollup(Array.from({ length: n }, () => plan({})));

const api = {
  listClients: vi.fn(async () => ({
    clients: [
      { ...client, rank: 0, projects: 1, rollup: many(4) },
      { id: "cl2", name: "PMalmö", client_number: "PM-001", archived: false, created_at: "", updated_at: "", rank: 1, projects: 1, rollup: many(1) },
      { id: "cl3", name: "Region Gotland", client_number: "G-001", archived: false, created_at: "", updated_at: "", rank: 2, projects: 1, rollup: many(2) },
    ],
    unsorted: 1,
  })),
  getClient: vi.fn(async () => ({ client, rank: 0, projects: [{ ...project, rollup: rollup([plan({ planned_budget: 240000 }), plan({}), plan({}), plan({})]), years: [] }] })),
  getProject: vi.fn(async () => ({ client, project, plans })),
  createClient: vi.fn(async (i: { name: string }) => ({ ...client, id: "new", name: i.name })),
  createProject: vi.fn(), createProjectPlan: vi.fn(), updateClient: vi.fn(), deleteClient: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn(),
  shufflePattern: vi.fn(async () => 1), listUnsortedPlans: vi.fn(async () => []), movePlan: vi.fn(),
};
vi.mock("@/lib/api/hierarchy", () => api);

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T12:00:00+01:00"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const stat = (label: string) => screen.getByText(label, { selector: "dt" }).closest("div")!;

describe("steg 1: välj kund", () => {
  it("nyckeltal 3 kunder, 3 projekt, 7 kampanjer, och ingen budget på kundnivå", async () => {
    const { default: Page } = await import("./page");
    render(<Page />);
    expect(await screen.findByText("Region Gotland")).toBeTruthy();
    const hero = screen.getByRole("heading", { name: "Mediaplaner" }).closest("section")!;
    const heroStat = (label: string) => within(hero).getByText(label, { selector: "dt" }).closest("div")!;
    expect(within(heroStat("Kunder")).getByText("3")).toBeTruthy();
    expect(within(heroStat("Projekt")).getByText("3")).toBeTruthy();
    expect(within(heroStat("Kampanjer")).getByText("7")).toBeTruthy();
    expect(screen.queryByText(/budget/i)).toBeNull();
    expect(screen.getByText("Kundnr BB-001")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Visa projekt för PMalmö" }).getAttribute("href")).toBe("/mediaplan/kund/cl2");
    expect(screen.getByText("Osorterade planer (1)")).toBeTruthy();
  });

  it("sökning 'bb' visar 1 av 3, tom sökning går att rensa", async () => {
    const user = userEvent.setup();
    const { default: Page } = await import("./page");
    render(<Page />);
    await screen.findByText("Region Gotland");
    expect(screen.getByRole("status").textContent).toBe("3 kunder");
    await user.type(screen.getByLabelText("Sök kund"), "bb");
    expect(screen.getByRole("status").textContent).toBe("Visar 1 av 3 kunder");
    expect(screen.queryByText("Region Gotland")).toBeNull();
    await user.clear(screen.getByLabelText("Sök kund"));
    await user.type(screen.getByLabelText("Sök kund"), "zzz");
    expect(screen.getByText("Ingen kund matchar ”zzz”")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rensa sökningen" }));
    expect(screen.getByText("Region Gotland")).toBeTruthy();
  });

  it("växlaren Kort/Lista visar en tabell och valet sparas", async () => {
    const user = userEvent.setup();
    const { default: Page } = await import("./page");
    const first = render(<Page />);
    await screen.findByText("Region Gotland");
    expect(screen.getByRole("button", { name: "Kort" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("columnheader", { name: "Kundnr" })).toBeTruthy();
    first.unmount();
    render(<Page />);
    await screen.findByText("Region Gotland");
    await waitFor(() => expect(screen.getByRole("button", { name: "Lista" }).getAttribute("aria-pressed")).toBe("true"));
  });

  it("skapar en ny kund och går vidare till den", async () => {
    const user = userEvent.setup();
    const { default: Page } = await import("./page");
    render(<Page />);
    await screen.findByText("Region Gotland");
    await user.click(screen.getByText("Lägg till kund").closest("button")!);
    await user.type(screen.getByLabelText(/Kundens namn/), "Solbacka");
    await user.click(screen.getByRole("button", { name: "Skapa kund" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/mediaplan/kund/new"));
    expect(api.createClient).toHaveBeenCalledWith({ name: "Solbacka", clientNumber: "" });
  });
});

describe("steg 2: kundens projekt", () => {
  it("visar projektet som affisch, utan budget i heron, och Blanda mönster sparas", async () => {
    const user = userEvent.setup();
    const { default: ClientStep } = await import("./kund/[id]/ClientStep");
    render(<ClientStep id="cl1" />);
    expect(await screen.findByRole("heading", { name: "Jul 2026" })).toBeTruthy();
    expect(screen.getByText("Kundnr BB-001 · 1 projekt · 4 kampanjer")).toBeTruthy();
    expect(screen.getByText("240 000 kr")).toBeTruthy();
    expect(screen.getAllByText(/Planerad budget/)).toHaveLength(1); // bara på projektkortet
    expect(screen.getByRole("link", { name: "Öppna Jul 2026" }).getAttribute("href")).toBe("/mediaplan/projekt/pr1");
    await user.click(screen.getByRole("button", { name: /Blanda mönster/ }));
    expect(api.shufflePattern).toHaveBeenCalledWith("pr1");
  });
});

describe("steg 3: årsplan och kampanjer", () => {
  it("nyckeltal 4 kampanjer, 2 pågår, 1 av 4 godkända, och rätt filterantal", async () => {
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Årsplan 2026" });
    expect(within(stat("Kampanjer")).getByText("4")).toBeTruthy();
    expect(within(stat("Pågår just nu")).getByText("2")).toBeTruthy();
    expect(stat("Godkända").textContent).toBe("Godkända1 av 4");
    expect(stat("Planerad budget 2026").textContent).toContain("240 000 kr");
    const chips = within(screen.getByRole("group", { name: "Filtrera kampanjer" })).getAllByRole("button").map((b) => b.textContent);
    expect(chips).toEqual(["Alla4", "Pågår nu2", "Avslutade2", "Utkast3", "Godkända1"]);
  });

  it("korten ligger i ordning Julbak, Test 3, Test 2, Test1 med rätt nedräkning", async () => {
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Kampanjer 2026" });
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Brovik Bageri: Julbak 2026", "Test 3", "Test 2", "Test1"]);
    expect(screen.getByText("37 dagar kvar")).toBeTruthy();
    expect(screen.getByText("Dag 2 av 39")).toBeTruthy();
    expect(screen.getByText("44 dagar kvar")).toBeTruthy();
    expect(screen.getByText("Dag 262 av 306")).toBeTruthy();
    expect(screen.getByText("Avslutades 8 feb")).toBeTruthy();
    expect(screen.getByText("Avslutades 30 apr")).toBeTruthy();
    // Kundens och projektets namn visas inte som taggar, bara kampanjens egna.
    const card = screen.getByRole("heading", { name: "Test1" }).closest("article")!;
    expect(within(card).getByText("Test1", { selector: "span" })).toBeTruthy();
    expect(within(card).queryByText("Brovik Bageri")).toBeNull();
    expect(within(card).queryByText("Jul 2026")).toBeNull();
  });

  it("årsplanen har ett block per kampanj och idag-linje med etikett", async () => {
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Årsplan 2026" });
    const bar = screen.getByRole("button", { name: "Brovik Bageri: Julbak 2026, 16 nov – 24 dec, godkänd. Öppna kampanjens plan" });
    expect(bar.style.left).toBe("87.397%");
    expect(screen.getByRole("button", { name: "Test 3, 1 mar – 31 dec, utkast. Öppna kampanjens plan" }).style.left).toBe("16.164%");
    expect(screen.getByText("Idag 17 nov")).toBeTruthy();
  });

  it("filtret döljer kort och tonar ner block, och tomt filter säger det", async () => {
    const user = userEvent.setup();
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Kampanjer 2026" });
    await user.click(screen.getByRole("button", { name: /^Godkända/ }));
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Brovik Bageri: Julbak 2026"]);
    expect(screen.getByRole("button", { name: /^Test1,/ }).style.opacity).toBe("0.18");
    expect(screen.getByRole("button", { name: /^Brovik Bageri: Julbak 2026,/ }).style.opacity).toBe("1");
  });

  it("hover på ett block tonar ner övriga block och kort, åt båda håll", async () => {
    const user = userEvent.setup();
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Kampanjer 2026" });
    await user.hover(screen.getByRole("button", { name: /^Test 3,/ }));
    expect(screen.getByRole("button", { name: /^Test1,/ }).style.opacity).toBe("0.28");
    expect(screen.getByRole("heading", { name: "Test1" }).closest("div.group")!.className).toContain("opacity-40");
    expect(screen.getByRole("heading", { name: "Test 3" }).closest("div.group")!.className).not.toContain("opacity-40");
    await user.unhover(screen.getByRole("button", { name: /^Test 3,/ }));
    // Och åt andra hållet: hover på ett kort markerar kampanjens block.
    await user.hover(screen.getByRole("heading", { name: "Test 2" }));
    expect(screen.getByRole("button", { name: /^Test1,/ }).style.opacity).toBe("0.28");
    expect(screen.getByRole("button", { name: /^Test 2,/ }).style.opacity).toBe("1");
  });

  it("Se rapport där rapport finns, Skapa rapport där den saknas, och klick på block öppnar planen", async () => {
    const user = userEvent.setup();
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Kampanjer 2026" });
    const julbak = screen.getByRole("heading", { name: "Brovik Bageri: Julbak 2026" }).closest("article")!;
    await waitFor(() => expect(within(julbak).getByRole("button", { name: "Se rapport" })).toBeTruthy());
    const test3 = screen.getByRole("heading", { name: "Test 3" }).closest("article")!;
    expect(within(test3).getByRole("button", { name: "Skapa rapport" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Test 3,/ }));
    expect(await screen.findByRole("dialog", { name: "plan test3" })).toBeTruthy();
  });

  it("rapportknappen är grå på en kampanj som inte har startat", async () => {
    api.getProject.mockResolvedValueOnce({ client, project, plans: [plan({ id: "next", campaign_name: "Vårkampanj", period_start: "2026-11-29", period_end: "2026-12-31" })] });
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Vårkampanj" });
    expect(screen.getByText("Startar om 12 dagar")).toBeTruthy();
    const btn = await screen.findByRole("button", { name: "Skapa rapport" });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Rapport kan skapas när kampanjen har startat/)).toBeTruthy();
  });

  it("årsväljaren byter år och kampanjer över årsskiftet syns båda åren", async () => {
    const user = userEvent.setup();
    const { default: ProjectStep } = await import("./projekt/[id]/ProjectStep");
    render(<ProjectStep id="pr1" />);
    await screen.findByRole("heading", { name: "Årsplan 2026" });
    await user.click(screen.getByRole("button", { name: "Lägg till 2027" }));
    expect(screen.getByRole("heading", { name: "Årsplan 2027" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2027" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText(/^Idag/)).toBeNull(); // idag-linjen visas bara för innevarande år
    expect(screen.queryByRole("button", { name: /^Test/ })).toBeNull(); // inga kampanjer pågår 2027
    expect(screen.getByText(/Inga kampanjer 2027 än/)).toBeTruthy();
  });
});

describe.skipIf(!process.env.MEDIAPLAN_SHOTS)("skärmbilder", () => {
  it("steg 1–3 på desktop och mobil", async () => {
    const { default: puppeteer } = await import("puppeteer-core");
    const cssDir = path.resolve(__dirname, "../../../.next/static/chunks");
    const tailwind = fs.readdirSync(cssDir).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(cssDir, f), "utf8")).join("\n");
    const pages: [string, () => Promise<React.ReactElement>, string][] = [
      ["1-kunder", async () => { const { default: P } = await import("./page"); return <P />; }, "Region Gotland"],
      ["2-projekt", async () => { const { default: P } = await import("./kund/[id]/ClientStep"); return <P id="cl1" />; }, "Blanda mönster"],
      ["3-planer", async () => { const { default: P } = await import("./projekt/[id]/ProjectStep"); return <P id="pr1" />; }, "Test 3"],
    ];
    const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    try {
      for (const [name, el, waitText] of pages) {
        const { container } = render(await el());
        await screen.findAllByText(new RegExp(waitText));
        await new Promise((r) => setTimeout(r, 80));
        const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link href="https://fonts.googleapis.com/css2?family=REM:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>${tailwind}body{font-family:'REM',system-ui,sans-serif;background:#F2F2F2;margin:0}.font-display{font-family:'REM',system-ui,sans-serif}</style></head><body><div style="height:56px;background:#1C1C1C;color:#fff;display:flex;align-items:center;padding:0 24px;font-weight:900;border-bottom:1px solid #2B2B2B">MILOU</div>${container.innerHTML}</body></html>`;
        cleanup();
        for (const [suffix, w, h] of [["", 1440, 900], ["-mobil", 390, 844]] as const) {
          const p = await browser.newPage();
          await p.setViewport({ width: w, height: h });
          await p.setContent(html, { waitUntil: "load" });
          await p.evaluate("document.fonts.ready");
          await p.screenshot({ path: path.join(os.homedir(), "Desktop", `mediaplan-steg-${name}${suffix}.png`) as `${string}.png`, fullPage: true });
          await p.close();
        }
      }
    } finally {
      await browser.close();
    }
  }, 90000);
});
