"use client";

import { PLACEMENTS, RATIOS, type Placement, type Ratio } from "@/lib/formatkoll/placements";
import type { AssetMap } from "./PreviewWorkspace";

interface Props {
  activeId: string;
  showAll: boolean;
  assets: AssetMap;
  /** Placeringar med egen inläggstext markeras, annars syns det inte att en
   *  kanal avviker förrän man klickar in på den. */
  overrides?: Record<string, string>;
  onSelect: (placement: Placement) => void;
  onShowAll: () => void;
}

/** Placeringar vars format finns uppladdat. */
export const availablePlacements = (assets: AssetMap): Placement[] =>
  PLACEMENTS.filter((p) => p.ratios.some((r: Ratio) => assets[r]));

export default function PlacementRail({
  activeId,
  showAll,
  assets,
  overrides,
  onSelect,
  onShowAll,
}: Props) {
  const anyFile = RATIOS.some((r) => assets[r]);
  // Innan något laddats upp finns inget att filtrera på. Då visas hela listan
  // nedtonad, så man ser vad verktyget täcker — en tom meny säger ingenting.
  const list = anyFile ? availablePlacements(assets) : PLACEMENTS;
  let currentChannel = "";

  return (
    <nav className="fk-rail-list" aria-label="Placeringar">
      <button
        type="button"
        className="fk-item fk-item-all"
        aria-current={showAll}
        onClick={onShowAll}
      >
        Alla placeringar
        {anyFile && <em>{list.length}</em>}
      </button>

      {list.map((p) => {
        const header = p.channel !== currentChannel ? p.channel : null;
        currentChannel = p.channel;
        const has = p.ratios.some((r: Ratio) => assets[r]);

        return (
          <div key={p.id}>
            {header && <div className="fk-group">{header}</div>}
            <button
              type="button"
              className={`fk-item${has ? "" : " fk-missing"}`}
              aria-current={!showAll && p.id === activeId}
              onClick={() => onSelect(p)}
            >
              {p.name}
              {overrides?.[p.id] !== undefined && (
                <span className="fk-own-dot" title="Egen inläggstext" />
              )}
              <em>{p.ratios.join(" / ")}</em>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
