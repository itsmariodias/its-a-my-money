import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { toDay } from '@/shared/dates';

export type PeriodMode = 'day' | 'month' | 'year';

/** Returns the YYYY-MM-DD inclusive bounds for a given mode + date. */
export function getDateRange(mode: PeriodMode, date: Date): { start: string; end: string } {
  if (mode === 'day') return { start: toDay(date), end: toDay(date) };
  if (mode === 'month') return { start: toDay(startOfMonth(date)), end: toDay(endOfMonth(date)) };
  return { start: toDay(startOfYear(date)), end: toDay(endOfYear(date)) };
}

export function periodNavLabel(mode: PeriodMode, date: Date): string {
  if (mode === 'day') return format(date, 'MMM d, yyyy');
  if (mode === 'month') return format(date, 'MMMM yyyy');
  return format(date, 'yyyy');
}

/** Whether `date` is in the period that holds today: today, this month or this year. */
export function isCurrentPeriod(mode: PeriodMode, date: Date, now: Date = new Date()): boolean {
  if (mode === 'day') return isSameDay(date, now);
  if (mode === 'month') return isSameMonth(date, now);
  return isSameYear(date, now);
}

/** Short contextual label for use inside summary cards ("this month", "today", "2025", …). */
export function shortPeriodLabel(mode: PeriodMode, date: Date): string {
  if (mode === 'day') return isCurrentPeriod(mode, date) ? 'today' : format(date, 'MMM d');
  if (mode === 'month') return isCurrentPeriod(mode, date) ? 'this month' : format(date, 'MMM yyyy');
  return isCurrentPeriod(mode, date) ? 'this year' : format(date, 'yyyy');
}

/**
 * One period back or forward. Stepping into the current period lands on today, so switching to
 * Day mode afterwards shows today.
 */
export function navigatePeriod(mode: PeriodMode, date: Date, dir: 1 | -1, now: Date = new Date()): Date {
  const next = stepPeriod(mode, date, dir);
  return isCurrentPeriod(mode, next, now) ? now : next;
}

function stepPeriod(mode: PeriodMode, date: Date, dir: 1 | -1): Date {
  if (mode === 'day') return addDays(date, dir);
  // Month and year mode land on the last day of the month. The step itself goes from the 1st:
  // stepping from the day is what went wrong before (Oct 31 → "Sep 31" rolled over to Oct 1, and
  // Sep 30 → Oct 30 instead of Oct 31). Year mode keeps the month.
  if (mode === 'month') return endOfMonth(addMonths(startOfMonth(date), dir));
  return endOfMonth(addYears(startOfMonth(date), dir));
}
