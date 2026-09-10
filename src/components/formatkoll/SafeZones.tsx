import type { SafeZone } from "@/lib/formatkoll/placements";

/** Röd yta = täcks av plattformens gränssnitt. Gul ram = fri yta. */
export default function SafeZones({ safe }: { safe: SafeZone }) {
  const { top, right, bottom, left } = safe;
  if (!top && !right && !bottom && !left) return null;

  return (
    <div className="fk-layer">
      <div className="fk-zone" style={{ top: 0, left: 0, right: 0, height: `${top}%` }} />
      <div className="fk-zone" style={{ bottom: 0, left: 0, right: 0, height: `${bottom}%` }} />
      <div className="fk-zone" style={{ top: `${top}%`, bottom: `${bottom}%`, left: 0, width: `${left}%` }} />
      <div className="fk-zone" style={{ top: `${top}%`, bottom: `${bottom}%`, right: 0, width: `${right}%` }} />
      <div
        className="fk-saferect"
        style={{ top: `${top}%`, bottom: `${bottom}%`, left: `${left}%`, right: `${right}%` }}
      >
        <span className="fk-safetag">Fri yta</span>
      </div>
    </div>
  );
}
