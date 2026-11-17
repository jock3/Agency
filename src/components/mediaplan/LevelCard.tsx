import Link from "next/link";
import ArrowSquare from "@/components/shared/ArrowSquare";
import { formatKr, type Rollup } from "@/lib/mediaplan/hierarchy";

/**
 * Kort för en kund eller ett projekt. Siffrorna kommer från rollup(), som
 * senare kan få utfall från rapporterna (statistik per nivå).
 */
export default function LevelCard({ href, title, subtitle, facts, rollup, muted }: {
  href: string;
  title: string;
  subtitle?: string;
  facts?: string[];
  rollup?: Rollup;
  muted?: boolean;
}) {
  const stats = rollup
    ? [
        rollup.plannedBudget > 0 ? `Planerad budget ${formatKr(rollup.plannedBudget)}` : null,
        rollup.yearPlans ? `${rollup.yearPlans} ${rollup.yearPlans === 1 ? "årsplan" : "årsplaner"}` : null,
        rollup.campaigns ? `${rollup.campaigns} ${rollup.campaigns === 1 ? "kampanj" : "kampanjer"}` : null,
      ].filter(Boolean)
    : [];
  return (
    <Link
      href={href}
      className={`milou-plate bg-white group flex flex-col p-5 min-h-[9rem] hover:bg-peach/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-milou-500 ${muted ? "opacity-60" : ""}`}
    >
      <span className="font-extrabold text-plum-dark text-xl leading-tight line-clamp-2 group-hover:underline">{title}</span>
      {subtitle && <span className="text-sm text-gray-500 mt-1">{subtitle}</span>}
      <span className="flex-1" />
      {[...(facts ?? []), ...stats].length > 0 && (
        <span className="text-xs text-gray-600 mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {[...(facts ?? []), ...stats].map((f) => <span key={f as string}>{f}</span>)}
        </span>
      )}
      <span className="mt-4 self-end"><ArrowSquare /></span>
    </Link>
  );
}
