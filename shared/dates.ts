import {
  addDays as addDaysToDate,
  addMonths,
  differenceInCalendarDays,
  format,
  getYear,
  parse,
  parseISO,
  setYear,
  subDays,
} from 'date-fns';

/**
 * The app stores calendar days as 'YYYY-MM-DD' strings (SQLite, stores, backups) and months as
 * 'YYYY-MM'. Both sort and compare correctly as plain strings, so `a < b` and `slice` for the
 * month key are fine. Everything else — stepping, counting, formatting — goes through date-fns.
 * Never do date arithmetic by hand: the lint rule in .eslintrc.js rejects the Date setters/getters.
 */

const DAY = 'yyyy-MM-dd';
const MONTH = 'yyyy-MM';

/** A 'YYYY-MM-DD' string as a Date at local midnight. */
export function parseDay(day: string): Date {
  return parseISO(day);
}

/** A Date as its local 'YYYY-MM-DD' string. */
export function toDay(date: Date): string {
  return format(date, DAY);
}

/** A 'YYYY-MM' string as a Date on the 1st of that month. */
export function parseMonth(month: string): Date {
  return parse(month, MONTH, new Date());
}

/** A Date as its local 'YYYY-MM' string. */
export function toMonth(date: Date): string {
  return format(date, MONTH);
}

export function todayString(): string {
  return toDay(new Date());
}

/** The 'YYYY-MM' month a 'YYYY-MM-DD' day falls in. */
export function monthKeyOf(day: string): string {
  return day.slice(0, 7);
}

/** A 'YYYY-MM-DD' day moved by `days` calendar days (negative goes back). DST-safe. */
export function addDays(day: string, days: number): string {
  return toDay(addDaysToDate(parseDay(day), days));
}

/** The calendar day before a 'YYYY-MM-DD' day. */
export function previousDay(day: string): string {
  return toDay(subDays(parseDay(day), 1));
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). DST-safe. */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseDay(to), parseDay(from));
}

/** A 'YYYY-MM' month moved by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  return toMonth(addMonths(parseMonth(month), delta));
}

/** The year of a 'YYYY-MM' month. */
export function yearOfMonth(month: string): number {
  return getYear(parseMonth(month));
}

/** A 'YYYY-MM' month moved to another year, keeping the month. */
export function withYear(month: string, year: number): string {
  return toMonth(setYear(parseMonth(month), year));
}

/** The 1st of a 'YYYY-MM' month as 'YYYY-MM-DD'. */
export function firstDayOfMonth(month: string): string {
  return toDay(parseMonth(month));
}
