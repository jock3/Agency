import type { MediaLine, MediaCategory, FullMediaPlan } from "@/lib/types";

export function calcLineTotal(line: MediaLine): number {
  return (line.cost_per_unit ?? 0) * (line.quantity ?? 0);
}

export function calcCategoryTotal(lines: MediaLine[]): number {
  return lines.reduce((sum, line) => sum + calcLineTotal(line), 0);
}

export function calcPlanTotal(plan: FullMediaPlan): number {
  return plan.categories.reduce(
    (sum, cat) => sum + calcCategoryTotal(cat.lines),
    0
  );
}

export function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
