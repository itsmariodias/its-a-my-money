import { addDays, addMonths, addWeeks, differenceInCalendarMonths } from 'date-fns';
import type { RecurringFrequency } from '@/types';
import { parseDay, toDay } from '@/shared/dates';

const MONTHS_PER_STEP = { monthly: 1, quarterly: 3, yearly: 12 } as const;

/**
 * Advance a YYYY-MM-DD date string by one frequency unit.
 * Monthly, quarterly and yearly advancement clamp to the last day of the target month.
 *
 * Pass the schedule's start date as `anchor` when stepping a recurring item: the result goes back
 * to the anchor's day of the month whenever the target month has it. Without it, the clamped day
 * sticks — Jan 31 → Feb 28 → Mar 28 — and an item set for the 31st ends up on the 28th for good.
 */
export function advanceDate(current: string, frequency: RecurringFrequency, anchor?: string): string {
  const date = parseDay(current);
  if (frequency === 'daily') return toDay(addDays(date, 1));
  if (frequency === 'weekly') return toDay(addWeeks(date, 1));

  // Count the step from the anchor rather than from `current`, so a day clamped in a short month
  // is not carried forward. addMonths does the clamping.
  const start = anchor ? parseDay(anchor) : date;
  const months = differenceInCalendarMonths(date, start) + MONTHS_PER_STEP[frequency];
  return toDay(addMonths(start, months));
}
