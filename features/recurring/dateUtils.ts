import type { RecurringFrequency } from '@/types';

/**
 * Advance a YYYY-MM-DD date string by one frequency unit.
 * Monthly, quarterly and yearly advancement clamp to the last day of the target month.
 *
 * Pass the schedule's start date as `anchor` when stepping a recurring item: the result goes back
 * to the anchor's day of the month whenever the target month has it. Without it, the clamped day
 * sticks — Jan 31 → Feb 28 → Mar 28 — and an item set for the 31st ends up on the 28th for good.
 */
export function advanceDate(current: string, frequency: RecurringFrequency, anchor?: string): string {
  const [year, month, currentDay] = current.split('-').map(Number);
  // The day of the month the schedule wants; month-based steps clamp it to the target month.
  const day = anchor ? Number(anchor.slice(8, 10)) : currentDay;

  switch (frequency) {
    case 'daily': {
      const d = new Date(year, month - 1, currentDay + 1);
      return toISODate(d);
    }
    case 'weekly': {
      const d = new Date(year, month - 1, currentDay + 7);
      return toISODate(d);
    }
    case 'monthly': {
      const targetMonth = month === 12 ? 1 : month + 1;
      const targetYear = month === 12 ? year + 1 : year;
      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      const clampedDay = Math.min(day, lastDay);
      return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    }
    case 'quarterly': {
      // Advance by 3 months, clamping to the last day of the target month.
      const zeroBasedTarget = month - 1 + 3;
      const targetYear = year + Math.floor(zeroBasedTarget / 12);
      const targetMonth = (zeroBasedTarget % 12) + 1;
      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      const clampedDay = Math.min(day, lastDay);
      return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    }
    case 'yearly': {
      // Feb 29 in a non-leap year → Feb 28
      const targetYear = year + 1;
      const lastDay = new Date(targetYear, month, 0).getDate();
      const clampedDay = Math.min(day, lastDay);
      return `${String(targetYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    }
  }
}

/** A local Date as a YYYY-MM-DD string. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function todayString(): string {
  return toISODate(new Date());
}

/**
 * The local calendar day before a YYYY-MM-DD date string.
 * Uses date components rather than subtracting 24h, so DST transitions don't skip or repeat a day.
 */
export function previousDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return toISODate(new Date(year, month - 1, day - 1));
}

/** A YYYY-MM-DD date string moved by `days` local calendar days (negative goes back). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return toISODate(new Date(year, month - 1, day + days));
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). DST-safe. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}
