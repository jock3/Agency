"use client";

import type { RefObject } from "react";
import FeedCard from "./FeedCard";
import PhoneFrame from "./PhoneFrame";
import type { AssetRef } from "./VideoSurface";
import type { NaturalSize, Placement, Ratio } from "@/lib/formatkoll/placements";
import type { ReferenceOverlay } from "./PhoneFrame";

interface Props {
  placement: Placement;
  ratio: Ratio;
  asset: AssetRef | null;
  natural: NaturalSize | undefined;
  caption: string;
  clientName: string;
  showChrome: boolean;
  showSafe: boolean;
  muted: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onNaturalSize: (url: string, size: NaturalSize) => void;
  reference?: ReferenceOverlay | null;
}

/** Väljer scen efter placeringens läge. Samma komponent i editorn och i kundvyn. */
export default function PreviewStage(props: Props) {
  const Frame = props.placement.mode === "phone" ? PhoneFrame : FeedCard;
  return (
    <div className="fk-frame-wrap">
      <Frame {...props} />
    </div>
  );
}
