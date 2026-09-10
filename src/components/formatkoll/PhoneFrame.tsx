"use client";

import type { RefObject } from "react";
import Chrome from "./Chrome";
import SafeZones from "./SafeZones";
import VideoSurface, { type AssetRef } from "./VideoSurface";
import type { CSSProperties } from "react";
import {
  frameAspect,
  frameLabel,
  type NaturalSize,
  type Placement,
  type Ratio,
} from "@/lib/formatkoll/placements";

export interface ReferenceOverlay {
  url: string;
  opacity: number;
  scale: number;
  x: number;
  y: number;
}

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
  /** Endast i kalibreringsläge. */
  reference?: ReferenceOverlay | null;
}

/** Helskärmsplaceringar: Reels, Stories, TikTok, Shorts, Spotlight. */
export default function PhoneFrame({
  placement,
  ratio,
  asset,
  natural,
  caption,
  clientName,
  showChrome,
  showSafe,
  muted,
  videoRef,
  onNaturalSize,
  reference,
}: Props) {
  return (
    <div className="fk-phone-stack">
      <div
        className="fk-phone"
        style={{ "--fk-ar": frameAspect(ratio, natural) } as CSSProperties}
      >
        <div className="fk-phone-screen">
          <div className="fk-vidbox" style={{ width: "100%", height: "100%" }}>
            <VideoSurface
              ref={videoRef}
              asset={asset}
              ratio={ratio}
              muted={muted}
              onNaturalSize={onNaturalSize}
              requirement={`${placement.channel} ${placement.name} kräver ${ratio}. Släpp filen i rutan uppe till vänster.`}
            />
          </div>
          {/* Utan fil finns inget att lägga gränssnitt eller skyddszoner ovanpå —
              de tre lagren hamnade i varandra och gjorde rutan oläsbar. */}
          {asset && showChrome && (
            <div className="fk-layer fk-chrome">
              <Chrome kind={placement.chrome} handle={clientName} caption={caption} />
            </div>
          )}
          {asset && showSafe && <SafeZones safe={placement.safe} />}
          {reference && (
            <div className="fk-reference">
              <img
                src={reference.url}
                alt=""
                style={{
                  opacity: reference.opacity / 100,
                  transform: `translate(${reference.x}%, ${reference.y}%) scale(${reference.scale / 100})`,
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div className="fk-frame-label">{frameLabel(ratio, natural)}</div>
    </div>
  );
}
