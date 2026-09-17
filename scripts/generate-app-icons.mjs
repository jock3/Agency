/* Renders the installable-app icons into public/. Run with
 * `node scripts/generate-app-icons.mjs` after changing the design. */

import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og.js";
import { createElement as h } from "react";

const RED = "#E60330";

// The check sits inside the central 60% so maskable crops never clip it.
function icon(size) {
  const stroke = Math.round(size * 0.085);
  return h(
    "div",
    {
      style: {
        width: size,
        height: size,
        background: RED,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    h(
      "svg",
      { width: size * 0.5, height: size * 0.5, viewBox: "0 0 24 24" },
      h("path", {
        d: "M4.5 12.5l5 5L19.5 7",
        fill: "none",
        stroke: "white",
        strokeWidth: (stroke / (size * 0.5)) * 24,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
    ),
  );
}

for (const [file, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  const res = new ImageResponse(icon(size), { width: size, height: size });
  await writeFile(new URL(`../public/${file}`, import.meta.url), Buffer.from(await res.arrayBuffer()));
  console.log(`public/${file}`);
}
