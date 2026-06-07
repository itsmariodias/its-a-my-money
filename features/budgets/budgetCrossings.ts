import type { BudgetWithDetails, Transaction } from '@/types';
import { currentPeriodRange, spentInRange } from './periodUtils';

type TxLike = Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date'>;

// Returns budgets whose current-period spend crossed from below limit to >= limit
// between the prev and curr transaction snapshots.
export function findCrossings(
  budgets: BudgetWithDetails[],
  prevTransactions: TxLike[],
  currTransactions: TxLike[],
  today: Date = new Date()
): BudgetWithDetails[] {
  const crossed: BudgetWithDetails[] = [];
  for (const b of budgets) {
    if (b.amount <= 0) continue;
    const { start, end } = currentPeriodRange(b.period, today);
    const prev = spentInRange(prevTransactions, b.category_id, start, end);
    const curr = spentInRange(currTransactions, b.category_id, start, end);
    if (prev < b.amount && curr >= b.amount) crossed.push(b);
  }
  return crossed;
}
