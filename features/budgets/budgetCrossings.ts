import type { BudgetWithDetails, Transaction } from '@/types';
import { currentPeriodRange, spentInRange } from './periodUtils';

type TxLike = Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>;

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
  const crossed: BudgetWithDetails[] = [];
  for (const b of budgets) {
    if (b.amount <= 0) continue;
    const { start, end } = currentPeriodRange(b.period, today);
    const filter = accountCurrencyById
      ? { currency: b.currency, accountCurrencyById }
      : undefined;
    const prev = spentInRange(prevTransactions, b.category_id, start, end, filter);
    const curr = spentInRange(currTransactions, b.category_id, start, end, filter);
    if (prev < b.amount && curr >= b.amount) crossed.push(b);
  }
  return crossed;
}
