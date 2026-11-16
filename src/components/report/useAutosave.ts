"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReportDoc } from "@/lib/report/doc";

export type SaveState = "saved" | "dirty" | "saving" | "error";

/**
 * Sparar rapporten mot servern en stund efter senaste ändringen.
 *
 * Bara ett anrop pågår åt gången. Ändrar man något medan ett sparas sparas den
 * senaste versionen direkt efter, så att ett långsamt svar aldrig skriver över
 * nyare data. Efter ett fel försöker den igen vid nästa ändring eller via retry.
 * Sparar två personer samma rapport vinner den som sparar sist.
 */
export function useAutosave(id: string, doc: ReportDoc, initial: ReportDoc) {
  const [state, setState] = useState<SaveState>("saved");
  const latest = useRef(doc);
  const lastSaved = useRef(initial);
  const inflight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    while (latest.current !== lastSaved.current) {
      const sending = latest.current;
      setState("saving");
      try {
        const res = await fetch(`/api/mediaplan/rapport/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc: sending }),
        });
        if (!res.ok) throw new Error(String(res.status));
        lastSaved.current = sending;
      } catch {
        inflight.current = false;
        setState("error");
        return;
      }
    }
    inflight.current = false;
    setState("saved");
  }, [id]);

  useEffect(() => {
    latest.current = doc;
    if (doc === lastSaved.current) return;
    setState((s) => (s === "saving" ? s : "dirty"));
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
    return () => clearTimeout(timer.current);
  }, [doc, flush]);

  // Lämnar man editorn inom appen (klick på en länk eller flik) körs inte beforeunload.
  // Då sparas det som väntar direkt, innan tidtagaren hunnit gå.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (latest.current !== lastSaved.current) void flush();
    },
    [flush],
  );

  // Varna innan man lämnar sidan med osparat arbete.
  useEffect(() => {
    if (state === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  return { state, retry: flush };
}
