import type { RecurringTransaction, RecurringTransactionWithDetails } from '@/types';
import { advanceDate } from './dateUtils';

export function getRecurringItemCurrency(item: RecurringTransactionWithDetails, fallback: string): string {
  return item.account_currency || fallback;
}

export type RecurringOccurrence = Pick<
  RecurringTransaction,
  'amount' | 'kind' | 'type' | 'category_id' | 'account_id' | 'to_account_id'
> & { date: string };

export type RecurringTemplate = Pick<
  RecurringTransaction,
  'amount' | 'kind' | 'type' | 'category_id' | 'account_id' | 'to_account_id'
  | 'frequency' | 'start_date' | 'end_date' | 'next_due_date' | 'is_active'
>;

// A daily item over a few years; anything past this is a runaway loop, not a forecast.
const MAX_OCCURRENCES_PER_ITEM = 2000;

/**
 * Every date an active recurring item will fire in `from..to` (inclusive), starting at its
 * next_due_date and stopping at its end_date. Sorted by date.
 */
export function expandOccurrences(
  items: readonly RecurringTemplate[],
  from: string,
  to: string,
): RecurringOccurrence[] {
  const out: RecurringOccurrence[] = [];
  for (const item of items) {
    if (!item.is_active) continue;
    const last = item.end_date !== null && item.end_date < to ? item.end_date : to;
    let date = item.next_due_date;
    for (let i = 0; i < MAX_OCCURRENCES_PER_ITEM && date <= last; i++) {
      if (date >= from) {
        out.push({
          date,
          amount: item.amount,
          kind: item.kind,
          type: item.type,
          category_id: item.category_id,
          account_id: item.account_id,
          to_account_id: item.to_account_id,
        });
      }
      date = advanceDate(date, item.frequency, item.start_date);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
