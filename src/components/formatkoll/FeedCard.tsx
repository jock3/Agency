"use client";

import type { RefObject } from "react";
import SafeZones from "./SafeZones";
import type { ReferenceOverlay } from "./PhoneFrame";
import VideoSurface, { type AssetRef } from "./VideoSurface";
import {
  frameLabel,
  frameRatio,
  type NaturalSize,
  type Placement,
  type Ratio,
} from "@/lib/formatkoll/placements";

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

/** LinkedIn, Facebook och Instagram Feed — video i ett kort, inte helskärm. */
export default function FeedCard({
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
  const isLinkedIn = placement.chrome === "lifeed";
  const isInstagram = placement.chrome === "igfeed";

  // Kortet följer filens egen proportion. Instagram Feed visar 4:5 lika gärna
  // som 1:1, och då ska ramen visa 4:5 — inte tvinga in den i en kvadrat.
  const video = (
    <div className="fk-vidbox" style={{ width: "100%", aspectRatio: frameRatio(ratio, natural) }}>
      <VideoSurface
        ref={videoRef}
        asset={asset}
        ratio={ratio}
        muted={muted}
        onNaturalSize={onNaturalSize}
        requirement={`${placement.channel} ${placement.name} kräver ${ratio}. Släpp filen i rutan uppe till vänster.`}
      />
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
  );

  const label = <div className="fk-frame-label">{frameLabel(ratio, natural)}</div>;

  const card = () => {
    if (!showChrome) return <div className="fk-card-host">{video}</div>;

    const head = (
      <div className="fk-card-head">
        <span className="fk-ava" />
        <span className="fk-who">
          {clientName}
          <small>{isLinkedIn ? "Kommunikationsbyrå · Följ" : "Sponsrad"}</small>
        </span>
      </div>
    );

    if (isInstagram) {
      return (
        <div className="fk-card-host">
          {head}
          {video}
          <div className="fk-card-actions fk-ig">
            <span>Gilla</span>
            <span>Kommentera</span>
            <span>Dela</span>
          </div>
          <div className="fk-card-body" style={{ paddingTop: 2 }}>
            <b>{clientName}</b> {caption}
          </div>
        </div>
      );
    }

    const actions = isLinkedIn
      ? ["Gilla", "Kommentera", "Dela", "Skicka"]
      : ["Gilla", "Kommentera", "Dela"];

    return (
      <div className="fk-card-host">
        {head}
        <div className="fk-card-body">{caption}</div>
        {video}
        <div className="fk-card-counts">
          <span>1 284 visningar</span>
          <span>96 reaktioner</span>
        </div>
        <div className="fk-card-actions">
          {actions.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fk-card-stack">
      {card()}
      {label}
    </div>
  );
}
