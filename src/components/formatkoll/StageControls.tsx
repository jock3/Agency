"use client";

import type { Placement, Ratio } from "@/lib/formatkoll/placements";

interface Props {
  placement: Placement;
  ratio: Ratio;
  onRatio: (ratio: Ratio) => void;
  showSafe: boolean;
  onShowSafe: (v: boolean) => void;
  showChrome: boolean;
  onShowChrome: (v: boolean) => void;
  muted: boolean;
  onToggleSound: () => void;
  onReplay: () => void;
  hasAsset: boolean;
  /** Samlingsvyn har ingen enskild video att styra och inget format att välja. */
  overview?: boolean;
  meta: string;
}

export default function StageControls({
  placement,
  ratio,
  onRatio,
  showSafe,
  onShowSafe,
  showChrome,
  onShowChrome,
  muted,
  onToggleSound,
  onReplay,
  hasAsset,
  overview,
  meta,
}: Props) {
  return (
    <div className="fk-caption-bar">
      <label className="fk-toggle">
        <input type="checkbox" checked={showSafe} onChange={(e) => onShowSafe(e.target.checked)} />
        Skyddszoner
      </label>
      <label className="fk-toggle">
        <input type="checkbox" checked={showChrome} onChange={(e) => onShowChrome(e.target.checked)} />
        Gränssnitt
      </label>
      {/* Ljudknappen måste sätta video.muted i en direkt klickhanterare —
          görs den asynkron blockerar Safari den. */}
      {!overview && (
        <>
          <button type="button" className="fk-btn" onClick={onToggleSound} disabled={!hasAsset}>
            {muted ? "Ljud på" : "Ljud av"}
          </button>
          <button type="button" className="fk-btn" onClick={onReplay} disabled={!hasAsset}>
            Spela om
          </button>
        </>
      )}
      {!overview && placement.ratios.length > 1 && (
        <div className="fk-ratio-pick">
          {placement.ratios.map((r) => (
            <button key={r} type="button" aria-pressed={r === ratio} onClick={() => onRatio(r)}>
              {r}
            </button>
          ))}
        </div>
      )}
      <div className="fk-meta">{meta}</div>
    </div>
  );
}
