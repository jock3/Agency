import { describe, expect, it } from "vitest";
import { normalizeDoc } from "./doc";
import { renderAll, renderDocument, renderPage } from "./render";
import { PAGE_CSS, FONT_LINK } from "./css";
import { sampleDoc } from "./sample";

describe("rendering", () => {
  it("escapar text från dokumentet", () => {
    const doc = sampleDoc();
    doc.meta.client = '<img src=x onerror="alert(1)">';
    doc.sections[0] = { id: "c", type: "cover", subtitle: "<script>x</script>" };
    const html = renderPage(doc, 0);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("släpper bara igenom PNG-logotyper som data-URL", () => {
    const doc = normalizeDoc({
      sections: [],
      logos: { meta: "data:image/png;base64,AAAA", evil: 'javascript:alert(1)', svg: "data:image/svg+xml;base64,AAAA", quote: 'data:image/png;base64,AA"onload="x' },
    })!;
    expect(Object.keys(doc.logos)).toEqual(["meta"]);
  });

  it("normalizeDoc kastar bort okända sektionstyper och ogiltiga KPI:er", () => {
    const doc = normalizeDoc({ sections: [{ type: "bogus" }, { type: "kpi", kpis: ["ctr", "nope", "ctr"] }] })!;
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]).toMatchObject({ type: "kpi", kpis: ["ctr"] });
  });

  it("hela rapporten blir ett dokument med en sida per sektion", () => {
    const html = renderDocument(sampleDoc(), PAGE_CSS, FONT_LINK);
    expect(html.match(/class="rp-page /g)).toHaveLength(6);
  });
});

describe("långa tabeller", () => {
  const big = (platforms: number, ads: number) => {
    const doc = sampleDoc();
    const s = doc.sections[3];
    if (s.type !== "stats") throw new Error();
    s.platforms = Array.from({ length: platforms }, (_, i) => ({
      id: `p${i}`, name: `Plattform ${i}`, values: {},
      ads: Array.from({ length: ads }, (_, j) => ({ id: `a${i}${j}`, name: `Annons ${j}`, values: { spend: 100, impressions: 1000, clicks: 10, conversions: 1 } })),
    }));
    return doc;
  };

  it("en kort tabell är en sida och exempelrapporten har sex sidor", () => {
    expect(renderAll(sampleDoc()).map((s) => s.pages.length)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("en lång tabell fortsätter på nya sidor med (forts.), totalraden står sist", () => {
    const pages = renderAll(big(8, 8))[3].pages;
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]).not.toContain("(forts.)</h2>");
    pages.slice(1).forEach((p) => expect(p).toContain("Bokningskampanj (forts.)</h2>"));
    expect(pages.filter((p) => p.includes("rp-st-total"))).toHaveLength(1);
    expect(pages[pages.length - 1]).toContain("rp-st-total");
    // Varje annons och plattform finns med exakt en gång.
    const all = pages.join("");
    for (let j = 0; j < 8; j++) expect(all.split(`Annons ${j}</td>`).length - 1).toBe(8);
  });

  it("sidnumren fortsätter efter en uppdelad sektion", () => {
    const doc = big(8, 8);
    const sections = renderAll(doc);
    const n = sections[3].pages.length;
    expect(sections[4].first).toBe(3 + n);
    expect(sections[5].pages[0]).toContain(`<b>${4 + n + 1}</b>`);
    expect(renderDocument(doc, PAGE_CSS, FONT_LINK).match(/class="rp-page /g)).toHaveLength(5 + n);
  });
});
