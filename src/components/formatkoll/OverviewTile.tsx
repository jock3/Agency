"use client";

import { useEffect, useRef } from "react";
import PreviewStage from "./PreviewStage";
import type { AssetRef } from "./VideoSurface";
import type { NaturalSize, Placement, Ratio } from "@/lib/formatkoll/placements";

interface Props {
  placement: Placement;
  ratio: Ratio;
  asset: AssetRef | null;
  natural: NaturalSize | undefined;
  caption: string;
  clientName: string;
  showChrome: boolean;
  showSafe: boolean;
  onNaturalSize: (url: string, size: NaturalSize) => void;
  onOpen: () => void;
}

/**
 * En ruta i samlingsvyn. Samma PreviewStage som helvyn, bara mindre.
 *
 * Videon pausas när rutan skrollas ur bild. Med åtta placeringar igång samtidigt
 * spelar annars åtta videoströmmar i bakgrunden, och Safari vägrar dessutom
 * autoplay på mer än ett fåtal element åt gången.
 */
export default function OverviewTile({
  placement,
  ratio,
  asset,
  natural,
  caption,
  clientName,
  showChrome,
  showSafe,
  onNaturalSize,
  onOpen,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tile = tileRef.current;
    if (!tile) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const v = videoRef.current;
        if (!v) return;
        if (entry.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(tile);
    return () => io.disconnect();
  }, [asset?.url]);

  return (
    <div className="fk-tile" ref={tileRef}>
      <button type="button" className="fk-tile-head" onClick={onOpen}>
        <b>
          {placement.channel} · {placement.name}
        </b>
        <em>{ratio}</em>
      </button>
      <div className="fk-tile-frame">
        <PreviewStage
          placement={placement}
          ratio={ratio}
          asset={asset}
          natural={natural}
          caption={caption}
          clientName={clientName}
          showChrome={showChrome}
          showSafe={showSafe}
          muted
          videoRef={videoRef}
          onNaturalSize={onNaturalSize}
        />
      </div>
    </div>
  );
}
