"use client";

import { useState } from "react";
import { SOURCES, type Ratio } from "@/lib/formatkoll/placements";
import type { AssetMap } from "./PreviewWorkspace";

/** Över den här storleken tittar kunden troligen via mobildata. Varna, blockera inte. */
export const SIZE_WARN_BYTES = 25 * 1024 * 1024;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface Props {
  assets: AssetMap;
  onPick: (ratio: Ratio, file: File) => void;
}

export default function SourceSlots({ assets, onPick }: Props) {
  const [dragging, setDragging] = useState<Ratio | null>(null);

  return (
    <div className="fk-slots">
      {SOURCES.map((s) => {
        const asset = assets[s.ratio];
        const big = asset?.sizeBytes != null && asset.sizeBytes > SIZE_WARN_BYTES;

        return (
          <label
            key={s.ratio}
            className={`fk-slot${asset ? " fk-filled" : ""}${dragging === s.ratio ? " fk-dragover" : ""}`}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(s.ratio);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(s.ratio);
            }}
            onDragLeave={() => setDragging(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(null);
              const file = e.dataTransfer.files[0];
              if (file && file.type.startsWith("video/")) onPick(s.ratio, file);
            }}
          >
            <span className={`fk-chip fk-r${s.ratio.replace(":", "")}`} />
            <span className="fk-slot-txt">
              <b>{s.label}</b>
              <small
                className={big ? "fk-warn" : undefined}
                title={
                  big
                    ? `${asset!.name} — ${mb(asset!.sizeBytes!)}. Stor fil, kunden tittar troligen via mobildata.`
                    : (asset?.name ?? s.note)
                }
              >
                {big ? `${mb(asset!.sizeBytes!)} — stor fil` : (asset?.name ?? s.note)}
              </small>
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPick(s.ratio, file);
                e.target.value = "";
              }}
            />
          </label>
        );
      })}
    </div>
  );
}
