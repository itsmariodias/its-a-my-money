import type { RecurringTransactionWithDetails } from '@/types';

export function getRecurringItemCurrency(item: RecurringTransactionWithDetails, fallback: string): string {
  return item.account_currency || fallback;
}
