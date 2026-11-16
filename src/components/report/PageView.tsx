"use client";

import { useEffect, useRef, useState } from "react";
import { FONT_LINK, PAGE_CSS, PAGE_H, PAGE_W } from "@/lib/report/css";

/** Sidornas stilar och typsnitt, en gång för hela editorn. */
export function PageStyles() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONT_LINK} precedence="default" />
      <style href="report-page-css" precedence="default">{PAGE_CSS}</style>
    </>
  );
}

/** Sidan som den ser ut i rapporten. HTML:en kommer från renderaren, som escapar all text. */
function Page({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Miniatyr i sidlistan: samma rendering som sidan, skalad till 164 px bred. */
export function Thumb({ html }: { html: string }) {
  const scale = 164 / PAGE_W;
  return (
    <div aria-hidden className="relative overflow-hidden bg-white" style={{ width: 164, height: 116 }}>
      <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: "none" }}>
        <Page html={html} />
      </div>
    </div>
  );
}

/**
 * Den valda sektionen i full storlek, skalad för att en sida ska passa ytan.
 * En statistiksida med lång tabell kan vara flera sidor; de står då under varandra och ytan går att rulla.
 */
export function Stage({ pages }: { pages: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const mobile = window.matchMedia("(max-width: 999px)").matches;
      const s = mobile ? w / PAGE_W : Math.min(w / PAGE_W, h / PAGE_H);
      setScale(Math.max(0.15, Math.min(s, 1.25)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const w = Math.floor(PAGE_W * scale);
  const h = Math.floor(PAGE_H * scale);
  return (
    <div
      ref={box}
      className={`min-w-0 min-[1000px]:min-h-0 min-[1000px]:flex-1 w-full flex flex-col items-center gap-4 ${pages.length > 1 ? "min-[1000px]:overflow-y-auto justify-start" : "justify-center"}`}
    >
      {pages.map((html, n) => (
        <div key={n} className="shadow-[0_1px_2px_rgba(0,0,0,.08),0_14px_36px_rgba(28,28,28,.16)] overflow-hidden bg-white shrink-0" style={{ width: w, height: h }}>
          <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
            <Page html={html} />
          </div>
        </div>
      ))}
    </div>
  );
}
