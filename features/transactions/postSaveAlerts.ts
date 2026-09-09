import type { Account, TransactionWithDetails } from '@/types';
import { buildAccountCurrencyMap } from '@/features/accounts/currencyUtils';
import { useBudgetsStore } from '@/features/budgets/useBudgetsStore';
import { findCrossings, notifyCrossedBudgets } from '@/features/budgets/budgetAlerts';
import { useGoalsStore } from '@/features/goals/useGoalsStore';
import { findReachedGoals, notifyReachedGoals } from '@/features/goals/goalAlerts';

/**
 * Fires the threshold notifications a manual transaction save can trigger: budgets crossing their
 * limit and goals reaching their target. Both compare a before/after snapshot of the transactions,
 * so callers must capture `prevTransactions` before saving.
 *
 * Fire-and-forget — notification failures never block a save.
 */
export function notifyThresholdsCrossed(
  prevTransactions: TransactionWithDetails[],
  currTransactions: TransactionWithDetails[],
  accounts: Account[],
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

  const reached = findReachedGoals(
    useGoalsStore.getState().goals,
    prevTransactions,
    currTransactions,
    accountCurrencyById
  );
  if (reached.length > 0) notifyReachedGoals(reached);
}
