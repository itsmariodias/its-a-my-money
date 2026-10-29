import type { Account, GoalWithDetails, TransactionWithDetails } from '@/types';
import { buildAccountCurrencyMap } from '@/features/accounts/currencyUtils';
import { useBudgetsStore } from '@/features/budgets/useBudgetsStore';
import { findCrossings, notifyCrossedBudgets } from '@/features/budgets/budgetAlerts';
import { findReachedGoals, notifyReachedGoals } from '@/features/goals/goalAlerts';

/**
 * Fires the threshold notifications a manual transaction save can trigger: budgets crossing their
 * limit and goals reaching their target. Both compare a before/after snapshot, so callers must
 * capture `prevTransactions` and `prevGoals` before saving.
 *
 * Fire-and-forget — notification failures never block a save.
 */
export function notifyThresholdsCrossed(
  prevTransactions: TransactionWithDetails[],
  currTransactions: TransactionWithDetails[],
  accounts: Account[],
  prevGoals: GoalWithDetails[],
  currGoals: GoalWithDetails[],
): void {
  const accountCurrencyById = buildAccountCurrencyMap(accounts, '');

  const crossed = findCrossings(
    useBudgetsStore.getState().budgets,
    prevTransactions,
    currTransactions,
    new Date(),
    accountCurrencyById
  );
  if (crossed.length > 0) notifyCrossedBudgets(crossed);

  notifyGoalsReached(prevGoals, currGoals);
}

/** The goal half on its own, for saves that move money without a transaction (a manual add). */
export function notifyGoalsReached(prevGoals: GoalWithDetails[], currGoals: GoalWithDetails[]): void {
  const reached = findReachedGoals(prevGoals, currGoals);
  if (reached.length > 0) notifyReachedGoals(reached);
}
