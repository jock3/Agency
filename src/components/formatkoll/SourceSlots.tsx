"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { ACCEPT, extForFile } from "@/lib/formatkoll/media";
import { SOURCES, type Ratio } from "@/lib/formatkoll/placements";
import type { AssetMap } from "./PreviewWorkspace";

/** Över den här storleken tittar kunden troligen via mobildata. Varna, blockera inte. */
export const SIZE_WARN_BYTES = 25 * 1024 * 1024;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface Props {
  assets: AssetMap;
  onPick: (ratio: Ratio, file: File) => void;
  /** Formatet som laddas upp just nu. */
  busy?: Ratio | null;
  /** "bar" är de små hållarna i verktygsfältet, "drop" de stora ytorna i ett
   *  tomt projekt, där filmen ska släppas första gången. */
  variant?: "bar" | "drop";
}

export default function SourceSlots({ assets, onPick, busy = null, variant = "bar" }: Props) {
  const [dragging, setDragging] = useState<Ratio | null>(null);

  return (
    <div className={variant === "drop" ? "fk-drops" : "fk-slots"}>
      {SOURCES.map((s) => {
        const asset = assets[s.ratio];
        const big = asset?.sizeBytes != null && asset.sizeBytes > SIZE_WARN_BYTES;
        const note = busy === s.ratio ? "Laddar upp…" : big ? `${mb(asset!.sizeBytes!)}, stor fil` : (asset?.name ?? s.note);

        return (
          <label
            key={s.ratio}
            className={`${variant === "drop" ? "fk-drop" : "fk-slot"}${asset ? " fk-filled" : ""}${dragging === s.ratio ? " fk-dragover" : ""}${busy === s.ratio ? " fk-busy" : ""}`}
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
              if (file && extForFile(file)) onPick(s.ratio, file);
            }}
          >
            {variant === "drop" ? (
              <>
                <span className="fk-drop-shape" style={{ aspectRatio: `${s.w} / ${s.h}` }}>
                  <Upload aria-hidden strokeWidth={1.5} />
                </span>
                <b>{s.label}</b>
                <small>
                  {s.ratio}, {s.note}
                </small>
                <span className="fk-drop-cta">{busy === s.ratio ? "Laddar upp…" : "Släpp en film eller välj fil"}</span>
              </>
            ) : (
              <>
                <span className={`fk-chip fk-r${s.ratio.replace(":", "")}`} />
                <span className="fk-slot-txt">
                  <b>{s.label}</b>
                  <small
                    className={big ? "fk-warn" : undefined}
                    title={big ? `${asset!.name}, ${mb(asset!.sizeBytes!)}. Stor fil, kunden tittar troligen via mobildata.` : note}
                  >
                    {note}
                  </small>
                </span>
              </>
            )}
            <input
              type="file"
              accept={ACCEPT}
              aria-label={`Ladda upp ${s.label.toLowerCase()} ${s.ratio}`}
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
