import type { Account, GoalWithDetails, Transaction, Transfer } from '@/types';
import { availableAsOf, isActiveGoal, overReservedAfterSave, type ReservableGoal } from './goalUtils';

/**
 * Goals that a save just made complete, comparing each goal before and after. Each side is
 * judged against its own target, so lowering a target below what is already saved counts as
 * reaching it. The under-to-at-or-over edge is strict: a goal fires once and stays quiet on every
 * later deposit. Archived goals are finished already and never fire.
 */
export function findReachedGoals(
  prevGoals: readonly Pick<GoalWithDetails, 'id' | 'saved' | 'target_amount'>[],
  currGoals: GoalWithDetails[],
): GoalWithDetails[] {
  const prevById = new Map(prevGoals.map((g) => [g.id, g]));
  return currGoals.filter((g) => {
    if (g.target_amount <= 0 || !isActiveGoal(g)) return false;
    const prev = prevById.get(g.id);
    const wasReached = prev != null && prev.target_amount > 0 && prev.saved >= prev.target_amount;
    return !wasReached && g.saved >= g.target_amount;
  });
}

/** The data Available is measured from, captured before and after a save. */
export interface BalanceSnapshot {
  transactions: readonly Pick<Transaction, 'account_id' | 'type' | 'amount' | 'date'>[];
  transfers: readonly Pick<Transfer, 'from_account_id' | 'to_account_id' | 'amount' | 'to_amount' | 'date'>[];
  goals: readonly ReservableGoal[];
}

export interface OverspentAccount {
  account: Account;
  /** Available after the save — below zero. */
  available: number;
}

/**
 * Accounts with goals whose Available a save just pushed below zero — money set aside for goals
 * was spent elsewhere. Measured as of `asOf` (today), like every Available figure. A save that
 * does not lower an already-negative Available is not reported, so it fires on the dip, not on
 * every later edit.
 */
export function findOverspentAccounts(
  accounts: readonly Account[],
  prev: BalanceSnapshot,
  curr: BalanceSnapshot,
  asOf: string,
): OverspentAccount[] {
  const withGoals = new Set(curr.goals.filter(isActiveGoal).map((g) => g.account_id));
  const overspent: OverspentAccount[] = [];
  for (const account of accounts) {
    if (!withGoals.has(account.id)) continue;
    const before = availableAsOf(account, prev.transactions, prev.transfers, prev.goals, asOf);
    const after = availableAsOf(account, curr.transactions, curr.transfers, curr.goals, asOf);
    const available = overReservedAfterSave(before, after);
    if (available !== null) overspent.push({ account, available });
  }
  return overspent;
}
