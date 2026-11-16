import { describe, expect, it } from "vitest";
import { normalizeDoc } from "./doc";
import { renderDocument, renderPage } from "./render";
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
