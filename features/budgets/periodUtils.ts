import { endOfMonth, endOfWeek, endOfYear, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import type { BudgetPeriod, Transaction } from '@/types';
import { toDay } from '@/shared/dates';

/** ISO week: Monday to Sunday. */
const WEEK = { weekStartsOn: 1 } as const;

export function currentPeriodRange(period: BudgetPeriod, today: Date = new Date()): { start: string; end: string } {
  if (period === 'weekly') return { start: toDay(startOfWeek(today, WEEK)), end: toDay(endOfWeek(today, WEEK)) };
  if (period === 'monthly') return { start: toDay(startOfMonth(today)), end: toDay(endOfMonth(today)) };
  return { start: toDay(startOfYear(today)), end: toDay(endOfYear(today)) };
}

export function spentInRange(
  transactions: readonly Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>[],
  categoryId: number,
  start: string,
  end: string,
  // Optional currency filter: when provided, only transactions whose account
  // currency matches are counted. Omitting it keeps the pre-multi-currency behavior
  // (sum across all accounts) — useful for tests and callers that don't care.
  currencyFilter?: { currency: string; accountCurrencyById: Record<number, string> },
): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (t.category_id !== categoryId) continue;
    if (t.date < start || t.date > end) continue;
    if (currencyFilter) {
      const accCurrency = currencyFilter.accountCurrencyById[t.account_id];
      if (accCurrency !== currencyFilter.currency) continue;
    }
    sum += t.amount;
  }
  return sum;
}

export function periodLabel(period: BudgetPeriod): string {
  if (period === 'weekly') return 'Weekly';
  if (period === 'monthly') return 'Monthly';
  return 'Yearly';
}
