import type { Account, GoalWithDetails, TransactionWithDetails, TransferWithDetails } from '@/types';
import { buildAccountCurrencyMap } from '@/features/accounts/currencyUtils';
import { useBudgetsStore } from '@/features/budgets/useBudgetsStore';
import { findCrossings, findNearingLimit, notifyCrossedBudgets, notifyNearingBudgets } from '@/features/budgets/budgetAlerts';
import { findOverspentAccounts, findReachedGoals, notifyOverspentAccounts, notifyReachedGoals } from '@/features/goals/goalAlerts';
import { useGoalsStore } from '@/features/goals/useGoalsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { todayString } from '@/features/recurring/dateUtils';

/** What the threshold checks compare: the stores as they stood before and after a save. */
export interface SaveSnapshot {
  transactions: TransactionWithDetails[];
  transfers: TransferWithDetails[];
  goals: GoalWithDetails[];
}

export function takeSaveSnapshot(): SaveSnapshot {
  return {
    transactions: useTransactionsStore.getState().transactions,
    transfers: useTransfersStore.getState().transfers,
    goals: useGoalsStore.getState().goals,
  };
}

/**
 * Fires the notifications a manual transaction or transfer save can trigger: budgets nearing or
 * crossing their limit, goals reaching their target, and accounts left with less than their goals hold.
 * Callers take a snapshot before saving and another after the stores are updated.
 *
 * Fire-and-forget — notification failures never block a save.
 */
export function notifyThresholdsCrossed(prev: SaveSnapshot, curr: SaveSnapshot, accounts: Account[]): void {
  const accountCurrencyById = buildAccountCurrencyMap(accounts, '');

  const budgets = useBudgetsStore.getState().budgets;
  const now = new Date();
  const crossed = findCrossings(budgets, prev.transactions, curr.transactions, now, accountCurrencyById);
  if (crossed.length > 0) notifyCrossedBudgets(crossed);
  const nearing = findNearingLimit(budgets, prev.transactions, curr.transactions, now, accountCurrencyById);
  if (nearing.length > 0) notifyNearingBudgets(nearing);

  notifyGoalsReached(prev.goals, curr.goals);

  const overspent = findOverspentAccounts(accounts, prev, curr, todayString());
  if (overspent.length > 0) notifyOverspentAccounts(overspent);
}

/** The goal half on its own, for saves that move money without a transaction (a manual add). */
export function notifyGoalsReached(prevGoals: GoalWithDetails[], currGoals: GoalWithDetails[]): void {
  const reached = findReachedGoals(prevGoals, currGoals);
  if (reached.length > 0) notifyReachedGoals(reached);
}
