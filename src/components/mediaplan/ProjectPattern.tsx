import type { CSSProperties } from "react";
import { HEX, projectPattern, type PatternCell } from "@/lib/mediaplan/pattern";

const SHAPE: Record<PatternCell["shape"], CSSProperties> = {
  circle: { top: "12%", right: "12%", bottom: "12%", left: "12%", borderRadius: "50%" },
  "q-tl": { borderRadius: "0 0 100% 0" },
  "q-tr": { borderRadius: "0 0 0 100%" },
  "q-bl": { borderRadius: "0 100% 0 0" },
  "q-br": { borderRadius: "100% 0 0 0" },
  "half-t": { bottom: "50%", borderRadius: "0 0 999px 999px" },
  "half-b": { top: "50%", borderRadius: "999px 999px 0 0" },
  square: { top: "24%", right: "24%", bottom: "24%", left: "24%" },
  ring: { top: "14%", right: "14%", bottom: "14%", left: "14%", borderRadius: "50%" },
  none: { display: "none" },
};

/** Projektets mönster, 4 × 4 rutor. Samma id och räknare ger alltid samma mönster. */
export default function ProjectPattern({ projectId, round = 0, size, className = "", grow = false }: { projectId: string; round?: number; size?: number; className?: string; grow?: boolean }) {
  const cells = projectPattern(projectId, round);
  return (
    <div
      aria-hidden
      className={`grid grid-cols-4 ${className}`}
      style={size ? { width: size, height: size } : { width: "100%", aspectRatio: "1 / 1" }}
    >
      {cells.map((c, i) => (
        <div key={i} className="relative overflow-hidden" style={{ background: HEX[c.bg], aspectRatio: "1 / 1" }}>
          <div
            className={`absolute inset-0 transition-transform duration-300 motion-reduce:transition-none ${grow && c.shape === "circle" ? "group-hover:scale-[1.08] motion-reduce:group-hover:transform-none" : ""}`}
            style={{
              background: c.shape === "ring" ? "transparent" : HEX[c.fg],
              ...(c.shape === "ring" ? { border: `${size && size < 200 ? 4 : 9}px solid ${HEX[c.fg]}` } : {}),
              ...SHAPE[c.shape],
            }}
          />
        </div>
      ))}
    </div>
  );
}
