import type { GoalWithDetails, Transaction } from '@/types';
import { goalProgress } from './goalUtils';

type TxLike = Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>;

/**
 * Goals that a save just pushed to their target. The below-to-at-or-above edge is strict, so a
 * goal fires once when reached and stays quiet on every later payment.
 */
export function findReachedGoals(
  goals: GoalWithDetails[],
  prevTransactions: TxLike[],
  currTransactions: TxLike[],
  accountCurrencyById?: Record<number, string>,
): GoalWithDetails[] {
  const reached: GoalWithDetails[] = [];

  for (const goal of goals) {
    if (goal.target_amount <= 0) continue;
    const filter = accountCurrencyById
      ? { currency: goal.currency, accountCurrencyById }
      : undefined;
    const prev = goalProgress(goal, prevTransactions, filter).saved;
    const curr = goalProgress(goal, currTransactions, filter).saved;
    if (prev < goal.target_amount && curr >= goal.target_amount) reached.push(goal);
  }

  return reached;
}
