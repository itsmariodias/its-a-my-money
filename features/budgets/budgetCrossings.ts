import type { BudgetWithDetails, Transaction } from '@/types';
import { currentPeriodRange, spentInRange } from './periodUtils';
import { BUDGET_WARNING_PCT } from './budgetStatus';

type TxLike = Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>;

/** A budget's current-period spend before and after a save, as a percentage of its limit. */
function pctBeforeAndAfter(
  b: BudgetWithDetails,
  prevTransactions: TxLike[],
  currTransactions: TxLike[],
  today: Date,
  accountCurrencyById?: Record<number, string>,
): { prev: number; curr: number } {
  const { start, end } = currentPeriodRange(b.period, today);
  const filter = accountCurrencyById
    ? { currency: b.currency, accountCurrencyById }
    : undefined;
  const prev = spentInRange(prevTransactions, b.category_id, start, end, filter);
  const curr = spentInRange(currTransactions, b.category_id, start, end, filter);
  return { prev: (prev / b.amount) * 100, curr: (curr / b.amount) * 100 };
}

// Returns budgets whose current-period spend crossed from below limit to >= limit
// between the prev and curr transaction snapshots. When `accountCurrencyById` is
// provided, spend is filtered to transactions on accounts of the budget's currency.
export function findCrossings(
  budgets: BudgetWithDetails[],
  prevTransactions: TxLike[],
  currTransactions: TxLike[],
  today: Date = new Date(),
  accountCurrencyById?: Record<number, string>,
): BudgetWithDetails[] {
  return budgets.filter((b) => {
    if (b.amount <= 0) return false;
    const { prev, curr } = pctBeforeAndAfter(b, prevTransactions, currTransactions, today, accountCurrencyById);
    return prev < 100 && curr >= 100;
  });
}

export interface NearingBudget {
  budget: BudgetWithDetails;
  /** Share of the limit spent after the save, below 100. */
  pct: number;
}

/**
 * Budgets a save just took past the warning line (BUDGET_WARNING_PCT) but not over the limit —
 * the heads-up while there is still room to change course. A save that jumps straight past 100%
 * is left to `findCrossings`, so one save never sends both alerts.
 */
export function findNearingLimit(
  budgets: BudgetWithDetails[],
  prevTransactions: TxLike[],
  currTransactions: TxLike[],
  today: Date = new Date(),
  accountCurrencyById?: Record<number, string>,
): NearingBudget[] {
  const nearing: NearingBudget[] = [];
  for (const b of budgets) {
    if (b.amount <= 0) continue;
    const { prev, curr } = pctBeforeAndAfter(b, prevTransactions, currTransactions, today, accountCurrencyById);
    if (prev < BUDGET_WARNING_PCT && curr >= BUDGET_WARNING_PCT && curr < 100) nearing.push({ budget: b, pct: curr });
  }
  return nearing;
}
