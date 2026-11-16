/**
 * Skapar PDF:en av exempelrapporten med samma kod som servern och sparar den.
 * Kör: npx tsx scripts/make-report-pdf.ts [utfil]   (standard /tmp/report-shots/exempel.pdf)
 */
import fs from "node:fs";
import { renderPdf } from "../src/lib/report/pdf";
import { sampleDoc } from "../src/lib/report/sample";

async function main() {
  const out = process.argv[2] ?? "/tmp/report-shots/exempel.pdf";
  fs.mkdirSync("/tmp/report-shots", { recursive: true });
  const t = Date.now();
  const { pdf, fontOk } = await renderPdf(sampleDoc());
  fs.writeFileSync(out, pdf);
  console.log(`${out}: ${(pdf.length / 1024).toFixed(0)} kB på ${Date.now() - t} ms, typsnittet REM ${fontOk ? "hämtades" : "SAKNAS (reservfont)"}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
