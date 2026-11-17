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
  /** Veckonummer, till exempel 47. */
  no: number;
  /** "16–22 nov" eller "30 nov–6 dec". */
  range: string;
}

const SHORT_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "16–22 nov" när veckan ligger i en månad, annars "30 nov–6 dec". */
export function weekRange(start: Date, end: Date): string {
  const a = `${start.getDate()}`;
  const b = `${end.getDate()} ${SHORT_MONTHS[end.getMonth()]}`;
  return start.getMonth() === end.getMonth() ? `${a}–${b}` : `${a} ${SHORT_MONTHS[start.getMonth()]}–${b}`;
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

  return weeks.map((weekStart, i) => {
    const endDate = endOfWeek(weekStart, { weekStartsOn: 1 });
    return {
      index: i + 1,
      startDate: weekStart,
      endDate,
      label: format(weekStart, "'v.'w", { locale: sv }),
      no: Number(format(weekStart, "w", { locale: sv })),
      range: weekRange(weekStart, endDate),
    };
  });
}

/**
 * Månadsrubriker över veckorna. Standard är att veckan hör till månaden där den börjar;
 * med "thursday" hör den till månaden där dess torsdag ligger (som i mediaplanen).
 */
export function getMonthGroups(weeks: WeekColumn[], rule: "start" | "thursday" = "start"): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let prevMonthKey = "";

  for (const week of weeks) {
    const anchor = rule === "thursday" ? addDays(week.startDate, 3) : week.startDate;
    const monthKey = format(anchor, "yyyy-MM");

    if (monthKey === prevMonthKey && groups.length > 0) {
      groups[groups.length - 1].spanCols += 1;
    } else {
      const label = format(anchor, "MMMM yyyy", { locale: sv });
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

/**
 * Som dateRangeToGridSpan, men veckan där slutdagen ligger räknas med hela. En rad som slutar
 * torsdag 24 dec täcker alltså hela v.52 (21–27 dec), som staplarna i mediaplanen ritas.
 */
export function dateRangeToWeekSpan(startDate: string, endDate: string, weeks: WeekColumn[]): { colStart: number; colEnd: number } {
  const colStart = dateToGridCol(startDate, weeks);
  const endIdx = differenceInCalendarWeeks(parseISO(endDate), weeks[0].startDate, { weekStartsOn: 1 });
  const colEnd = Math.min(endIdx + 2, weeks.length + 1);
  return { colStart, colEnd: Math.max(colEnd, colStart + 1) };
}

export function formatSwedishDate(dateStr: string): string {
  return format(parseISO(dateStr), "d/M", { locale: sv });
}

export function formatSwedishDateFull(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM yyyy", { locale: sv });
}
