"use client";

import { useState } from "react";
import {
  DEFAULT_TRANSFORM,
  toSource,
  type Calibration,
  type RefTransform,
  type ZoneOverride,
} from "@/lib/formatkoll/calibration";
import type { Placement } from "@/lib/formatkoll/placements";

interface Props {
  placement: Placement;
  override: ZoneOverride;
  onOverride: (next: ZoneOverride) => void;
  onReset: () => void;
  transform: RefTransform;
  onTransform: (next: RefTransform) => void;
  referenceName: string | null;
  onReference: (file: File | null) => void;
  calibration: Calibration;
}

const EDGES = [
  ["top", "Topp"],
  ["right", "Höger"],
  ["bottom", "Botten"],
  ["left", "Vänster"],
] as const;

export default function CalibrationPanel({
  placement,
  override,
  onOverride,
  onReset,
  transform,
  onTransform,
  referenceName,
  onReference,
  calibration,
}: Props) {
  const [copied, setCopied] = useState(false);

  function copySource() {
    navigator.clipboard.writeText(toSource(calibration));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <aside className="fk-cal">
      <h2>Kalibrering</h2>
      <p className="fk-cal-hint">
        Lägg en skärmdump av ett riktigt inlägg över ramen, passa in videoytan med
        skala och läge, och dra sedan zonsiffrorna tills de täcker plattformens
        knappar. Siffrorna sparas lokalt.
      </p>

      <div className="fk-cal-block">
        <label className="fk-cal-file">
          {referenceName ?? "Välj referensbild"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onReference(e.target.files?.[0] ?? null)}
          />
        </label>
        {referenceName && (
          <button type="button" className="fk-cal-link" onClick={() => onReference(null)}>
            Ta bort bilden
          </button>
        )}
      </div>

      {referenceName && (
        <div className="fk-cal-block">
          {(
            [
              ["opacity", "Opacitet", 0, 100],
              ["scale", "Skala", 50, 200],
              ["x", "Läge i sidled", -50, 50],
              ["y", "Läge i höjdled", -50, 50],
            ] as const
          ).map(([key, label, min, max]) => (
            <div key={key} className="fk-cal-row">
              <span>{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                value={transform[key]}
                onChange={(e) => onTransform({ ...transform, [key]: Number(e.target.value) })}
              />
              <b>{transform[key]}</b>
            </div>
          ))}
          <button
            type="button"
            className="fk-cal-link"
            onClick={() => onTransform(DEFAULT_TRANSFORM)}
          >
            Återställ passningen
          </button>
        </div>
      )}

      <div className="fk-cal-block">
        <h3>
          {placement.channel} · {placement.name}
        </h3>
        {EDGES.map(([edge, label]) => (
          <div key={edge} className="fk-cal-row">
            <span>{label}</span>
            <input
              type="range"
              min={0}
              max={40}
              step={0.1}
              value={override[edge]}
              onChange={(e) => onOverride({ ...override, [edge]: Number(e.target.value) })}
            />
            <input
              type="number"
              className="fk-cal-num"
              min={0}
              max={40}
              step={0.1}
              value={override[edge]}
              onChange={(e) => onOverride({ ...override, [edge]: Number(e.target.value) })}
            />
          </div>
        ))}

        <div className="fk-cal-row">
          <span>Textklipp</span>
          <input
            type="number"
            className="fk-cal-num fk-wide"
            min={0}
            max={500}
            value={override.clip ?? ""}
            placeholder="ingen"
            onChange={(e) =>
              onOverride({ ...override, clip: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>

        <button type="button" className="fk-cal-link" onClick={onReset}>
          Återställ den här placeringen
        </button>
      </div>

      <button type="button" className="fk-btn fk-cal-copy" onClick={copySource}>
        {copied ? "Kopierad" : "Kopiera till placements.ts"}
      </button>
    </aside>
  );
}
