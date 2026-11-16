// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { sampleDoc } from "@/lib/report/sample";
import { blankDoc } from "@/lib/report/doc";
import ReportEditor from "./ReportEditor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: unknown; href: string }) => createElement("a", { href }, children as never) }));

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const open = (doc = sampleDoc()) => render(<ReportEditor id="r1" initial={doc} />);
const slideLabels = () => within(screen.getByRole("navigation", { name: "Sektioner i rapporten" })).getAllByRole("button").map((b) => b.getAttribute("aria-label")).filter(Boolean);

describe("editorn i en simulerad webbläsare", () => {
  it("lägger till en sektion efter den valda och väljer den", async () => {
    const user = userEvent.setup();
    open(blankDoc("K", "C"));
    await user.click(screen.getByRole("button", { name: /Lägg till sektion/ }));
    await user.click(screen.getByRole("menuitem", { name: /Kommentar/ }));
    expect(slideLabels()).toEqual(["Sida 1: Startsida", "Sida 2: Kommentar · Rubrik"]);
    expect(screen.getByText("Sida 2 av 2")).toBeTruthy();
  });

  it("skriver man i ett siffrefält räknas kvoterna om, och komma får stå kvar under skrivning", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Sida 4: Statistik · Bokningskampanj" }));
    const field = screen.getAllByLabelText("Kostnad (kr)")[0] as HTMLInputElement; // Metas plattformsfält
    await user.clear(field);
    await user.type(field, "2,5");
    expect(field.value).toBe("2,5");
    await user.type(field, "x");
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });

  it("siffrefälten visar tusentalsavgränsare när man lämnar fältet", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Sida 4: Statistik · Bokningskampanj" }));
    const field = screen.getAllByLabelText("Kostnad (kr)")[0] as HTMLInputElement;
    await user.clear(field);
    await user.type(field, "1234567");
    expect(field.value).toBe("1234567");
    await user.tab();
    expect(field.value).toBe("1 234 567");
  });

  it("en lång tabell visas som flera sidor och sidnumren räknas om", () => {
    const doc = sampleDoc();
    const s = doc.sections[2];
    if (s.type !== "stats") throw new Error();
    s.platforms = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, values: {}, ads: Array.from({ length: 8 }, (_, j) => ({ id: `a${i}${j}`, name: `A${j}`, values: { spend: 1 } })) }));
    open(doc);
    fireEvent.click(screen.getByRole("button", { name: "Sida 3: Statistik · Kännedomskampanj" }));
    expect(screen.getByText(/tabellen fortsätter på \d+ sidor/)).toBeTruthy();
    expect(slideLabels()[3]).toMatch(/^Sida (\d+): Statistik · Bokningskampanj$/);
    expect(Number(slideLabels()[3]!.match(/\d+/)![0])).toBeGreaterThan(4);
  });

  it("Alt+pil flyttar sidan, pil byter sida", async () => {
    const user = userEvent.setup();
    open();
    const first = screen.getByRole("button", { name: "Sida 1: Startsida" });
    first.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(slideLabels()[1]).toBe("Sida 2: Startsida");
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByText(/Sida 3 av 6/).length).toBeGreaterThan(0);
  });

  /** jsdom saknar DragEvent, så musens läge läggs på händelsen för hand. */
  const dragOver = (el: Element, y: number, dt: object) => {
    const ev = createEvent.dragOver(el, { dataTransfer: dt });
    Object.defineProperty(ev, "clientY", { value: y });
    Object.defineProperty(ev, "clientX", { value: 10 });
    fireEvent(el, ev);
  };
  const dragSlide = (from: string, onto: string, y: number) => {
    const rect = { top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} };
    const target = screen.getByRole("button", { name: onto });
    target.getBoundingClientRect = () => rect;
    const dt = { effectAllowed: "", setData() {} };
    fireEvent.dragStart(screen.getByRole("button", { name: from }), { dataTransfer: dt });
    dragOver(target, y, dt);
    fireEvent.drop(target, { dataTransfer: dt });
  };

  it("dra och släpp i övre halvan av en sida lägger sidan före den", () => {
    open();
    dragSlide("Sida 5: Kommentar · Vad vi tar med oss", "Sida 2: KPI:er", 10);
    expect(slideLabels().slice(0, 3)).toEqual(["Sida 1: Startsida", "Sida 2: Kommentar · Vad vi tar med oss", "Sida 3: KPI:er"]);
  });

  it("dra och släpp i nedre halvan lägger sidan efter, och en sida släppt på sig själv ligger kvar", () => {
    open();
    dragSlide("Sida 5: Kommentar · Vad vi tar med oss", "Sida 2: KPI:er", 90);
    expect(slideLabels().slice(0, 3)).toEqual(["Sida 1: Startsida", "Sida 2: KPI:er", "Sida 3: Kommentar · Vad vi tar med oss"]);
    dragSlide("Sida 1: Startsida", "Sida 1: Startsida", 10);
    expect(slideLabels()[0]).toBe("Sida 1: Startsida");
  });

  it("Ta bort sektion går att ångra", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Ta bort sektionen" }));
    expect(slideLabels()).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: "Ångra" }));
    expect(slideLabels()).toHaveLength(6);
  });

  it("Ny tom rapport behåller logotyperna och går att ångra", async () => {
    const user = userEvent.setup();
    const doc = sampleDoc();
    doc.logos = { meta: "data:image/png;base64,AAAA" };
    open(doc);
    await user.click(screen.getByRole("button", { name: /Projekt/ }));
    await user.click(screen.getByRole("menuitem", { name: /Ny tom rapport/ }));
    expect(slideLabels()).toEqual(["Sida 1: Startsida"]);
    await user.click(screen.getByRole("button", { name: "Ångra" }));
    expect(slideLabels()).toHaveLength(6);
  });
});

describe("CSV-import", () => {
  const csv = "Ad name,Cost (SEK),Impressions,Reach,Clicks (destination),CTR (destination)\nVideo A,\"1,200.50\",50000,30000,400,0.8%\nVideo B,800,25000,15000,200,0.8%\n";
  const pick = (name: string) => {
    const f = new File([csv], name, { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Exportfil"), { target: { files: [f] } });
  };

  it("gissar plattform och kolumner, visar förhandsvisning och lägger till plattformen", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Sida 4: Statistik · Bokningskampanj" }));
    const before = screen.getByText(/Plattformar/).textContent;
    await user.click(screen.getByRole("button", { name: /Importera från CSV/ }));
    const dialog = screen.getByRole("dialog");
    pick("linkedin_campaign_export.csv");
    await waitFor(() => expect(within(dialog).getByText("Video A")).toBeTruthy());
    expect((within(dialog).getByLabelText("Plattform") as HTMLInputElement).value).toBe("LinkedIn");
    expect(within(dialog).getByText("1 201")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Importera" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Plattformar/).textContent).not.toBe(before);
    await user.click(screen.getByRole("button", { name: "Ångra" }));
    expect(screen.getByText(/Plattformar/).textContent).toBe(before);
  });

  it("en plattform med samma namn ersätts, och fel fil ger ett tydligt meddelande", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Sida 4: Statistik · Bokningskampanj" }));
    await user.click(screen.getByRole("button", { name: /Importera från CSV/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(screen.getByLabelText("Exportfil"), { target: { files: [new File(["bara text"], "x.csv")] } });
    await waitFor(() => expect(within(dialog).getByRole("alert")).toBeTruthy());
    pick("meta.csv");
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Ersätt Meta" })).toBeTruthy());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("PDF", () => {
  it("skickar det som syns i editorn och laddar ner svaret", async () => {
    const calls: { url: string; body: { doc: { meta: { client: string } } } }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, blob: async () => new Blob(["%PDF"]), headers: { get: () => "1" } };
    }));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download); });
    const user = userEvent.setup();
    open();
    fireEvent.change(screen.getAllByLabelText("Kundnamn")[0], { target: { value: "Ny kund" } });
    await user.click(screen.getByRole("button", { name: /Ladda ner PDF/ }));
    await waitFor(() => expect(clicked).toEqual(["Rapport Ny kund Sommarsäsongen 2026.pdf"]));
    const pdfCall = calls.find((c) => c.url.endsWith("/pdf"))!;
    expect(pdfCall.url).toBe("/api/mediaplan/rapport/r1/pdf");
    expect(pdfCall.body.doc.meta.client).toBe("Ny kund");
  });

  it("visar ett felmeddelande när PDF:en inte kan skapas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: /Ladda ner PDF/ }));
    await waitFor(() => expect(screen.getByText(/PDF:en kunde inte skapas/)).toBeTruthy());
  });
});

describe("autosparning", () => {
  it("sparar det som väntar när man lämnar editorn inom 800 ms", async () => {
    const sent: { doc: { meta: { client: string } } }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: { body: string }) => { sent.push(JSON.parse(init.body)); return { ok: true }; }));
    const { unmount } = open();
    fireEvent.change(screen.getAllByLabelText("Kundnamn")[0], { target: { value: "Snabb" } });
    unmount();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].doc.meta.client).toBe("Snabb");
  });

  it("skickar ett anrop åt gången och sparar senaste versionen efteråt", async () => {
    const calls: { resolve: (ok: boolean) => void; doc: { meta: { client: string } } }[] = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init: { body: string }) => new Promise((resolve) => {
      calls.push({ doc: JSON.parse(init.body).doc, resolve: (ok) => resolve({ ok }) });
    })));
    open();
    const client = screen.getAllByLabelText("Kundnamn")[0] as HTMLInputElement;
    fireEvent.change(client, { target: { value: "A" } });
    await waitFor(() => expect(calls).toHaveLength(1), { timeout: 3000 });
    fireEvent.change(client, { target: { value: "AB" } });
    await new Promise((r) => setTimeout(r, 1200));
    expect(calls).toHaveLength(1); // första anropet pågår fortfarande, inget nytt skickas
    await act(async () => { calls[0].resolve(true); });
    await waitFor(() => expect(calls).toHaveLength(2), { timeout: 3000 });
    expect(calls[1].doc.meta.client).toBe("AB");
    await act(async () => { calls[1].resolve(true); });
    await waitFor(() => expect(screen.getByRole("status", { name: "" }).textContent).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Sparat")).toBeTruthy());
  }, 15000);

  it("visar fel och försöker igen på begäran", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: ++n > 1 })));
    open();
    fireEvent.change(screen.getAllByLabelText("Kundnamn")[0], { target: { value: "X" } });
    await waitFor(() => expect(screen.getByText("Kunde inte spara")).toBeTruthy(), { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "Försök igen" }));
    await waitFor(() => expect(screen.getByText("Sparat")).toBeTruthy());
  }, 10000);
});
