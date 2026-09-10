"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./formatkoll.css";
import CalibrationPanel from "./CalibrationPanel";
import type { ReferenceOverlay } from "./PhoneFrame";
import OverviewTile from "./OverviewTile";
import PlacementRail, { availablePlacements } from "./PlacementRail";
import PreviewStage from "./PreviewStage";
import SourceSlots from "./SourceSlots";
import StageControls from "./StageControls";
import type { AssetRef } from "./VideoSurface";
import {
  DEFAULT_TRANSFORM,
  isCalibrating,
  loadCalibration,
  overrideFor,
  saveCalibration,
  withCalibration,
  type Calibration,
  type RefTransform,
  type ZoneOverride,
} from "@/lib/formatkoll/calibration";
import {
  PLACEMENTS,
  RATIOS,
  captionFor,
  clipCaption,
  type NaturalSize,
  type Placement,
  type Ratio,
} from "@/lib/formatkoll/placements";

export type AssetMap = Record<Ratio, AssetRef | null>;

export const emptyAssets = (): AssetMap => ({ "9:16": null, "1:1": null, "16:9": null });

interface Props {
  assets: AssetMap;
  clientName: string;
  caption: string;
  /** Kundvyn skickar readOnly: samma preview, utan uppladdning och textfält. */
  readOnly?: boolean;
  onPickFile?: (ratio: Ratio, file: File) => void;
  onClientNameChange?: (value: string) => void;
  onCaptionChange?: (value: string) => void;
  /** Egen text per placering. Saknad nyckel = kanalen ärver den delade texten. */
  captions?: Record<string, string>;
  /** null tar bort kanalens egna text så den återgår till den delade. */
  onCaptionOverride?: (placementId: string, value: string | null) => void;
  /** Mått hämtade ur databasen. Låter kundvyn rita rätt proportion direkt i
   *  stället för att först visa slottens nominella format och hoppa till rätt
   *  när videons metadata kommit in. */
  initialNaturals?: Partial<Record<Ratio, NaturalSize>>;
  /** Titel/kopiera-länk/sparstatus i toppraden. */
  headerRight?: React.ReactNode;
}

export default function PreviewWorkspace({
  assets,
  clientName,
  caption,
  readOnly = false,
  initialNaturals,
  onPickFile,
  onClientNameChange,
  onCaptionChange,
  captions,
  onCaptionOverride,
  headerRight,
}: Props) {
  const [placement, setPlacement] = useState<Placement>(PLACEMENTS[0]);
  // Samlingsvyn är förstaläget: alla placeringar bredvid varandra.
  const [showAll, setShowAll] = useState(true);
  const [ratio, setRatio] = useState<Ratio>(PLACEMENTS[0].ratios[0]);
  const [showSafe, setShowSafe] = useState(true);
  const [showChrome, setShowChrome] = useState(true);
  const [muted, setMuted] = useState(true);
  // Filernas riktiga mått, rapporterade av videon när metadatan lästs in.
  // Ramen följer dem i stället för slottens nominella format — en 4:5-film i
  // kvadratslotten ska ritas som 4:5.
  const [natural, setNatural] = useState<Record<string, NaturalSize>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Kalibreringsläge. Läses ur URL:en efter montering i stället för med
  // useSearchParams, så sidan slipper en Suspense-gräns den annars kräver.
  const [calibrating, setCalibrating] = useState(false);
  const [cal, setCal] = useState<Calibration>({});
  const [refs, setRefs] = useState<Record<string, { url: string; name: string }>>({});
  const [transforms, setTransforms] = useState<Record<string, RefTransform>>({});

  useEffect(() => {
    if (readOnly || !isCalibrating()) return;
    setCalibrating(true);
    setCal(loadCalibration());
  }, [readOnly]);

  // Placeringen som ska ritas: kalibrerade siffror när läget är på, annars
  // exakt det som står i placements.ts.
  const active = calibrating ? withCalibration(placement, cal) : placement;
  const asset = assets[ratio];
  const naturalSize = (asset ? natural[asset.url] : undefined) ?? initialNaturals?.[ratio];
  const hasAnyFile = RATIOS.some((r) => assets[r]);
  // Tas filen bort under en vald placering finns inget att visa. Då faller vyn
  // tillbaka till samlingen i stället för att stanna på en tom ram.
  const viewAll = showAll || (hasAnyFile && !placement.ratios.some((r) => assets[r]));
  const displayName = clientName.trim() || "Kundnamn";
  // Texten placeringen faktiskt visar: kanalens egen om den finns.
  const ownCaption = captions?.[placement.id];
  const effectiveCaption = captionFor(placement.id, caption, captions);
  const { text: shownCaption, clipped } = clipCaption(effectiveCaption, active.clip);

  // Stabil identitet, annars faller VideoSurface ur sin memoisering och
  // filmen startar om varje gång texten ändras.
  const handleNaturalSize = useCallback((url: string, size: NaturalSize) => {
    setNatural((prev) => {
      const cur = prev[url];
      if (cur && cur.w === size.w && cur.h === size.h) return prev;
      return { ...prev, [url]: size };
    });
  }, []);

  function selectPlacement(next: Placement) {
    setShowAll(false);
    setPlacement(next);
    setRatio(next.ratios.find((r) => assets[r]) ?? next.ratios[0]);
  }

  /** Placeringar att visa i samlingsvyn, med det format var och en ska ritas i. */
  const tiles = availablePlacements(assets).map((p) => ({
    placement: calibrating ? withCalibration(p, cal) : p,
    ratio: (p.ratios.find((r) => assets[r]) ?? p.ratios[0]) as Ratio,
  }));

  const transform = transforms[placement.id] ?? DEFAULT_TRANSFORM;
  const refImage = refs[placement.id];
  const reference: ReferenceOverlay | null =
    calibrating && refImage ? { url: refImage.url, ...transform } : null;

  function setOverride(next: ZoneOverride) {
    const updated = { ...cal, [placement.id]: next };
    setCal(updated);
    saveCalibration(updated);
  }

  function resetPlacement() {
    const updated = { ...cal };
    delete updated[placement.id];
    setCal(updated);
    saveCalibration(updated);
  }

  function setReference(file: File | null) {
    setRefs((prev) => {
      const old = prev[placement.id];
      if (old) URL.revokeObjectURL(old.url);
      const next = { ...prev };
      if (file) next[placement.id] = { url: URL.createObjectURL(file), name: file.name };
      else delete next[placement.id];
      return next;
    });
  }

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function replay() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play();
  }

  return (
    <div className={`fk-root${calibrating ? " fk-calibrating" : ""}`}>
      <header className="fk-top">
        <div className="fk-wordmark">
          Formatk<span>o</span>ll
        </div>
        {!readOnly && onPickFile && <SourceSlots assets={assets} onPick={onPickFile} />}
        {headerRight && <div style={{ marginLeft: "auto" }}>{headerRight}</div>}
      </header>

      <div className="fk-rail">
        <PlacementRail
          activeId={placement.id}
          showAll={viewAll}
          assets={assets}
          overrides={captions}
          onSelect={selectPlacement}
          onShowAll={() => setShowAll(true)}
        />

        {!readOnly && (
          <section className="fk-composer">
            <h2>Innehåll</h2>
            <div className="fk-row">
              <label htmlFor="fk-client">Kund</label>
              <input
                id="fk-client"
                value={clientName}
                maxLength={40}
                onChange={(e) => onClientNameChange?.(e.target.value)}
              />
            </div>
            <div className="fk-row" style={{ marginBottom: viewAll || ownCaption !== undefined ? 11 : 0 }}>
              <label htmlFor="fk-caption">
                Inläggstext
                <span className="fk-shared-tag">delad</span>
              </label>
              <textarea
                id="fk-caption"
                rows={4}
                maxLength={500}
                value={caption}
                onChange={(e) => onCaptionChange?.(e.target.value)}
              />
            </div>

            {/* Kanalerna klipper texten på olika ställen, och ibland behöver de
                olika text. Den delade texten gäller tills en kanal får en egen. */}
            {viewAll ? null : ownCaption === undefined ? (
              <button
                type="button"
                className="fk-own-add"
                onClick={() => onCaptionOverride?.(placement.id, caption)}
              >
                Skriv egen text för {placement.channel} {placement.name}
              </button>
            ) : (
              <div className="fk-row" style={{ marginBottom: 0 }}>
                <label htmlFor="fk-own-caption">
                  Egen text för {placement.channel} {placement.name}
                </label>
                <textarea
                  id="fk-own-caption"
                  rows={4}
                  maxLength={500}
                  value={ownCaption}
                  onChange={(e) => onCaptionOverride?.(placement.id, e.target.value)}
                />
                <button
                  type="button"
                  className="fk-own-drop"
                  onClick={() => onCaptionOverride?.(placement.id, null)}
                >
                  Använd den delade texten i stället
                </button>
              </div>
            )}

            {!viewAll && (
            <div className={`fk-count${clipped ? " fk-over" : ""}`}>
              <span>
                {active.clip
                  ? `${active.channel} visar ca ${active.clip} tecken`
                  : "Ingen textklippning här"}
              </span>
              <b>
                {active.clip
                  ? `${effectiveCaption.length} / ${active.clip}`
                  : effectiveCaption.length}
              </b>
            </div>
            )}
          </section>
        )}
      </div>

      <main className="fk-stage">
        {!hasAnyFile && !readOnly && (
          <div className="fk-hint">Dra in dina filer i rutorna uppe till vänster</div>
        )}

        {viewAll ? (
          <div className="fk-overview">
            {tiles.map(({ placement: p, ratio: r }) => {
              const a = assets[r];
              const own = captionFor(p.id, caption, captions);
              return (
                <OverviewTile
                  key={p.id}
                  placement={p}
                  ratio={r}
                  asset={a}
                  natural={a ? natural[a.url] : undefined}
                  caption={clipCaption(own, p.clip).text}
                  clientName={displayName}
                  showChrome={showChrome}
                  showSafe={showSafe}
                  onNaturalSize={handleNaturalSize}
                  onOpen={() => selectPlacement(p)}
                />
              );
            })}
            {tiles.length === 0 && (
              <p className="fk-overview-empty">
                Ladda upp en fil så dyker placeringarna upp här.
              </p>
            )}
          </div>
        ) : (
          <PreviewStage
            placement={active}
            ratio={ratio}
            asset={asset}
            natural={naturalSize}
            caption={shownCaption}
            clientName={displayName}
            showChrome={showChrome}
            showSafe={showSafe}
            muted={muted}
            videoRef={videoRef}
            onNaturalSize={handleNaturalSize}
            reference={reference}
          />
        )}

        <StageControls
          placement={active}
          ratio={ratio}
          onRatio={setRatio}
          showSafe={showSafe}
          onShowSafe={setShowSafe}
          showChrome={showChrome}
          onShowChrome={setShowChrome}
          muted={muted}
          onToggleSound={toggleSound}
          onReplay={replay}
          hasAsset={!!asset}
          overview={viewAll}
          meta={
            viewAll
              ? `Alla placeringar · ${tiles.length} av ${PLACEMENTS.length}`
              : `${active.channel} · ${active.name} · ${ratio}${asset ? ` · ${asset.name}` : " · ingen fil"}`
          }
        />
      </main>

      {calibrating && (
        <CalibrationPanel
          placement={placement}
          override={overrideFor(placement, cal)}
          onOverride={setOverride}
          onReset={resetPlacement}
          transform={transform}
          onTransform={(next) => setTransforms((prev) => ({ ...prev, [placement.id]: next }))}
          referenceName={refImage?.name ?? null}
          onReference={setReference}
          calibration={cal}
        />
      )}
    </div>
  );
}
