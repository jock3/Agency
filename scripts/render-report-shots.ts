/**
 * Skärmbildskontroll för rapportsidorna. Renderar exempelrapporten med vår
 * renderare och prototypens egen kod i lokala Chrome, tar en bild per sida
 * (1123 × 794) och räknar hur stor del av pixlarna som skiljer.
 *
 * Kör: npx tsx scripts/render-report-shots.ts [sökväg till prototypen]
 * Bilderna hamnar i /tmp/report-shots (a-N.png = vår, b-N.png = prototypen, d-N.png = skillnad).
 */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { sampleDoc } from "../src/lib/report/sample";
import { renderDocument } from "../src/lib/report/render";
import { FONT_LINK, PAGE_CSS, PAGE_H, PAGE_W } from "../src/lib/report/css";
import { testLogos } from "./test-png";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROTOTYPE = process.argv[2] ?? `${process.env.HOME}/Downloads/some-rapport-prototyp.html`;
const OUT = "/tmp/report-shots";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  try {
    // Prototypens sidor: ta deras HTML och stilar ur miniatyrerna, utan skalning.
    const proto = await browser.newPage();
    await proto.setViewport({ width: 1500, height: 900 });
    // Samma rapport, med provlogotyper, läggs i prototypens lagring så att båda ritar exakt samma data.
    const ours = sampleDoc();
    ours.logos = testLogos();
    await proto.goto(`file://${PROTOTYPE}`, { waitUntil: "load" });
    await proto.evaluate((json: string) => localStorage.setItem("some-rapport-v1", json), JSON.stringify(ours));
    await proto.reload({ waitUntil: "load" });
    const { style, pages } = await proto.evaluate(() => ({
      style: (document.querySelector("style") as HTMLStyleElement).textContent ?? "",
      pages: [...document.querySelectorAll(".thumb .page")].map((p) => p.outerHTML),
    }));
    await proto.close();

    if (pages.length !== ours.sections.length) throw new Error(`Olika antal sidor: prototypen ${pages.length}, vår ${ours.sections.length}`);

    const shoot = async (html: string, selector: string, prefix: string) => {
      const page = await browser.newPage();
      await page.setViewport({ width: PAGE_W, height: PAGE_H });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const els = await page.$$(selector);
      const files: string[] = [];
      for (let i = 0; i < els.length; i++) {
        const file = `${OUT}/${prefix}-${i + 1}.png`;
        await els[i].screenshot({ path: file as `${string}.png` });
        files.push(file);
      }
      await page.close();
      return files;
    };

    const a = await shoot(renderDocument(ours, PAGE_CSS, FONT_LINK), ".rp-page", "a");
    const protoHtml = `<!doctype html><html><head><meta charset="utf-8"><link href="${FONT_LINK}" rel="stylesheet"><style>${style}
      html,body{height:auto!important;background:#fff} .pw{width:1123px;height:794px;overflow:hidden}</style></head><body>${pages.map((p) => `<div class="pw">${p}</div>`).join("")}</body></html>`;
    const b = await shoot(protoHtml, ".pw", "b");

    // Jämför pixel för pixel i webbläsaren.
    const cmp = await browser.newPage();
    // tsx lägger till hjälpfunktionen __name i funktioner som skickas till webbläsaren.
    await cmp.evaluate('window.__name = (f) => f');
    for (let i = 0; i < a.length; i++) {
      const res = await cmp.evaluate(
        async (x: string, y: string) => {
          const load = (src: string) => new Promise<HTMLImageElement>((r) => { const im = new Image(); im.onload = () => r(im); im.src = src; });
          const [ia, ib] = await Promise.all([load(x), load(y)]);
          const c = (im: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const g = cv.getContext("2d")!; g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height); };
          const da = c(ia), db = c(ib);
          const out = new ImageData(da.width, da.height);
          let diff = 0;
          for (let p = 0; p < da.data.length; p += 4) {
            const d = Math.max(Math.abs(da.data[p] - db.data[p]), Math.abs(da.data[p + 1] - db.data[p + 1]), Math.abs(da.data[p + 2] - db.data[p + 2]));
            const bad = d > 24;
            if (bad) diff++;
            out.data.set(bad ? [230, 3, 48, 255] : [255, 255, 255, 255], p);
          }
          const cv = document.createElement("canvas"); cv.width = da.width; cv.height = da.height; cv.getContext("2d")!.putImageData(out, 0, 0);
          return { w: da.width, h: da.height, wb: db.width, hb: db.height, diff: diff / (da.width * da.height), png: cv.toDataURL("image/png") };
        },
        `data:image/png;base64,${fs.readFileSync(a[i]).toString("base64")}`,
        `data:image/png;base64,${fs.readFileSync(b[i]).toString("base64")}`,
      );
      fs.writeFileSync(`${OUT}/d-${i + 1}.png`, Buffer.from(res.png.split(",")[1], "base64"));
      console.log(`sida ${i + 1} (${ours.sections[i].type}): ${res.w}×${res.h} mot ${res.wb}×${res.hb}, ${(res.diff * 100).toFixed(2)} % av pixlarna skiljer`);
    }
    await cmp.close();
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
