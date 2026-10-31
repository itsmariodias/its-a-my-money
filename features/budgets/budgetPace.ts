import type { Budget, Transaction } from '@/types';
import { addDays, daysBetween, toDay } from '@/shared/dates';
import { expandOccurrences, type RecurringTemplate } from '@/features/recurring/recurringUtils';
import { currentPeriodRange, spentInRange } from './periodUtils';

/** Share of the period that must have passed before a pace means anything. */
export const BUDGET_PACE_MIN_ELAPSED = 0.2;

export interface BudgetPace {
  projected: number;
  overOn: string; // YYYY-MM-DD the projection first reaches the limit
}

/**
 * Where a budget is heading by the end of its current period, if that is over the limit.
 * Projection = spent to date + the daily pace of hand-entered spending for the days left
 * + future-dated entries and recurring expenses in this category that fall before the end.
 * Null when the budget is already at or over its limit, too little of the period has passed,
 * or the projection stays under the limit.
 */
export function budgetPace(
  budget: Pick<Budget, 'category_id' | 'amount' | 'period'>,
  transactions: readonly Pick<
    Transaction,
    'type' | 'category_id' | 'amount' | 'date' | 'account_id' | 'recurring_transaction_id'
  >[],
  recurring: readonly RecurringTemplate[],
  currencyFilter: { currency: string; accountCurrencyById: Record<number, string> },
  today: Date = new Date(),
): BudgetPace | null {
  const { start, end } = currentPeriodRange(budget.period, today);
  const todayStr = toDay(today);
  const { currency, accountCurrencyById } = currencyFilter;

  if (spentInRange(transactions, budget.category_id, start, end, currencyFilter) >= budget.amount) {
    return null;
  }

  const elapsedDays = daysBetween(start, todayStr) + 1;
  const totalDays = daysBetween(start, end) + 1;
  if (elapsedDays / totalDays < BUDGET_PACE_MIN_ELAPSED) return null;

  const spentToDate = spentInRange(transactions, budget.category_id, start, todayStr, currencyFilter);
  const handEntered = transactions.filter((t) => t.recurring_transaction_id === null);
  const pace = spentInRange(handEntered, budget.category_id, start, todayStr, currencyFilter) / elapsedDays;

  const tomorrow = addDays(todayStr, 1);
  const scheduled = [
    ...transactions.filter((t) => t.type === 'expense' && t.date >= tomorrow),
    ...expandOccurrences(recurring, tomorrow, end).filter((o) => o.kind === 'transaction' && o.type === 'expense'),
  ].filter((e) =>
    e.category_id === budget.category_id
    && e.date <= end
    && accountCurrencyById[e.account_id] === currency
  );

  let running = spentToDate;
  let overOn: string | null = null;
  for (let date = tomorrow; date <= end; date = addDays(date, 1)) {
    running += pace + scheduled.reduce((sum, e) => (e.date === date ? sum + e.amount : sum), 0);
    if (overOn === null && running >= budget.amount) overOn = date;
  }

  return overOn === null ? null : { projected: running, overOn };
}
