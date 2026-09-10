"use client";

import { forwardRef, memo, type MutableRefObject } from "react";
import { sourceFor, type NaturalSize, type Ratio } from "@/lib/formatkoll/placements";

export interface AssetRef {
  url: string;
  name: string;
  sizeBytes?: number;
}

interface Props {
  asset: AssetRef | null;
  ratio: Ratio;
  muted: boolean;
  /** Visas i tomma läget: "Instagram Reels kräver 9:16." */
  requirement: string;
  /** Filens riktiga mått, så ramen kan följa innehållet i stället för slotten.
   *  URL:en följer med eftersom samlingsvyn renderar flera videor samtidigt och
   *  varje rapport måste kunna knytas till rätt fil. */
  onNaturalSize?: (url: string, size: NaturalSize) => void;
}

/**
 * Videon är en egen memoiserad nod med key på käll-URL:en. Prototypen byggde om
 * hela DOM:en vid varje tangenttryckning, vilket startade om filmen så fort man
 * skrev i textrutan. Här ligger texten i syskonlagret i stället, så den här
 * komponenten renderar bara om när filen eller ljudet ändras.
 *
 * `muted` och `playsInline` sitter på elementet från start — utan båda vägrar
 * iOS spela upp automatiskt.
 */
const VideoSurface = forwardRef<HTMLVideoElement, Props>(function VideoSurface(
  { asset, ratio, muted, requirement, onNaturalSize },
  ref,
) {
  const src = sourceFor(ratio);

  if (!asset) {
    return (
      <div className="fk-empty">
        <b>Ingen {src.label.toLowerCase()} fil</b>
        <span>{requirement}</span>
      </div>
    );
  }

  /**
   * Safari tittar på muted-*attributet* i DOM:en när den avgör om autoplay är
   * tillåten, inte bara på egenskapen. React sätter bara egenskapen, så
   * attributet läggs på här. Fallgrop §11 i handoffen.
   */
  const attachRef = (el: HTMLVideoElement | null) => {
    if (el) {
      el.defaultMuted = true;
      el.setAttribute("muted", "");
    }
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as MutableRefObject<HTMLVideoElement | null>).current = el;
  };

  return (
    <video
      key={asset.url}
      ref={attachRef}
      src={asset.url}
      autoPlay
      loop
      playsInline
      muted={muted}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (v.videoWidth && v.videoHeight) {
          onNaturalSize?.(asset.url, { w: v.videoWidth, h: v.videoHeight });
        }
      }}
    />
  );
});

export default memo(VideoSurface);
