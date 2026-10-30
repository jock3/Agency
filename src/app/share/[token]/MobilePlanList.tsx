import type { FullMediaPlan } from "@/lib/types";
import { formatSwedishDate } from "@/lib/utils/dates";
import { calcLineTotal, calcCategoryTotal, calcPlanTotal, formatSEK, formatReach } from "@/lib/utils/budget";

// The Gantt needs at least 768 px. Below that the client gets the same plan as a list.
export default function MobilePlanList({ plan }: { plan: FullMediaPlan }) {
  return (
    <div className="md:hidden px-4 py-4 flex flex-col gap-6">
      {plan.categories.map((cat) => (
        <section key={cat.id}>
          <div className="flex items-center justify-between gap-3 pb-2 border-b-2" style={{ borderColor: cat.color }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} aria-hidden />
              <h3 className="font-display font-bold text-base text-gray-900 truncate">{cat.name}</h3>
            </div>
            <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
              {formatSEK(calcCategoryTotal(cat.lines))}
            </span>
          </div>
          {cat.lines.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">Inga kanaler än</p>
          ) : (
            <ul>
              {cat.lines.map((line) => {
                const start = line.start_date ?? plan.period_start;
                const end = line.end_date ?? plan.period_end;
                return (
                  <li key={line.id} className="flex items-start justify-between gap-3 py-3 border-b border-gray-100">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">{line.platform_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatSwedishDate(start)} – {formatSwedishDate(end)}
                        {line.estimated_reach ? ` · räckvidd ${formatReach(line.estimated_reach)}` : ""}
                      </p>
                    </div>
                    <span className="text-sm text-gray-900 tabular-nums shrink-0">{formatSEK(calcLineTotal(line))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
      <div className="flex items-center justify-between border-t-2 border-gray-900 pt-3">
        <span className="font-display font-bold text-base text-gray-900">Totalt</span>
        <span className="font-display font-bold text-base text-gray-900 tabular-nums">{formatSEK(calcPlanTotal(plan))}</span>
      </div>
    </div>
  );
}
