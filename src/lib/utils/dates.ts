import {
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  differenceInCalendarWeeks,
  addDays,
} from "date-fns";
import { sv } from "date-fns/locale";

export interface WeekColumn {
  index: number; // 1-based grid column
  startDate: Date;
  endDate: Date;
  label: string; // "v.1"
}

export interface MonthGroup {
  label: string; // "Juli 2024"
  startCol: number;
  spanCols: number;
}

export function getPlanWeeks(periodStart: string, periodEnd: string): WeekColumn[] {
  const start = startOfWeek(parseISO(periodStart), { weekStartsOn: 1 });
  const end = endOfWeek(parseISO(periodEnd), { weekStartsOn: 1 });

  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

  return weeks.map((weekStart, i) => ({
    index: i + 1,
    startDate: weekStart,
    endDate: endOfWeek(weekStart, { weekStartsOn: 1 }),
    label: format(weekStart, "'v.'w", { locale: sv }),
  }));
}

export function getMonthGroups(weeks: WeekColumn[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let prevMonthKey = "";

  for (const week of weeks) {
    const monthKey = format(week.startDate, "yyyy-MM");

    if (monthKey === prevMonthKey && groups.length > 0) {
      groups[groups.length - 1].spanCols += 1;
    } else {
      const label = format(week.startDate, "MMMM yyyy", { locale: sv });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      groups.push({ label: capitalizedLabel, startCol: week.index, spanCols: 1 });
      prevMonthKey = monthKey;
    }
  }

  return groups;
}

export function dateToGridCol(date: string, weeks: WeekColumn[]): number {
  const d = parseISO(date);
  const planStart = weeks[0].startDate;
  const colIndex = differenceInCalendarWeeks(d, planStart, { weekStartsOn: 1 });
  return Math.max(1, Math.min(colIndex + 1, weeks.length));
}

export function dateRangeToGridSpan(
  startDate: string,
  endDate: string,
  weeks: WeekColumn[]
): { colStart: number; colEnd: number } {
  const colStart = dateToGridCol(startDate, weeks);
  const end = parseISO(endDate);
  const planStart = weeks[0].startDate;
  const colEnd = Math.min(
    differenceInCalendarWeeks(addDays(end, 1), planStart, { weekStartsOn: 1 }) + 1,
    weeks.length + 1
  );
  return { colStart, colEnd: Math.max(colEnd, colStart + 1) };
}

export function formatSwedishDate(dateStr: string): string {
  return format(parseISO(dateStr), "d/M", { locale: sv });
}

export function formatSwedishDateFull(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM yyyy", { locale: sv });
}
