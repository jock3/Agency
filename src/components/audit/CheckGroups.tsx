import { Check as CheckIcon, TriangleAlert, X } from "lucide-react";
import type { Check } from "@/lib/audit/types";

type ShownCheck = Pick<Check, "id" | "group" | "label" | "status" | "detail">;

export function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-700";
  if (score >= 5) return "text-amber-600";
  return "text-milou-500";
}

/**
 * Kontrollerna per grupp (SEO och GEO) med status och vad vi hittade. Samma
 * lista visas för besökaren i det publika verktyget och internt under Externt
 * verktyg, så att vi ser exakt det besökaren fick.
 */
export default function CheckGroups({
  checks,
  seoScore,
  geoScore,
  id,
  className = "",
}: {
  checks: ShownCheck[];
  seoScore: number;
  geoScore: number;
  id?: string;
  className?: string;
}) {
  const groups = [
    { key: "seo" as const, label: "SEO", score: seoScore },
    { key: "geo" as const, label: "GEO", score: geoScore },
  ];

  return (
    <div id={id} className={`grid sm:grid-cols-2 gap-10 ${className}`}>
      {groups.map((g) => (
        <div key={g.key}>
          <h2 className="font-bold text-lg mb-3">
            {g.label} <span className={`tabular-nums ${scoreColor(g.score)}`}>{g.score}/10</span>
          </h2>
          <ul className="divide-y divide-gray-100 border-y border-gray-100">
            {checks
              .filter((c) => c.group === g.key)
              .map((c) => (
                <li key={c.id} className="py-2.5 flex gap-2.5 text-sm">
                  {c.status === "pass" ? (
                    <CheckIcon className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" aria-label="Godkänd" />
                  ) : c.status === "warn" ? (
                    <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-label="Brist" />
                  ) : (
                    <X className="w-4 h-4 shrink-0 mt-0.5 text-milou-500" aria-label="Fel" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold">{c.label}</p>
                    <p className="text-gray-500 break-words">{c.detail}</p>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
