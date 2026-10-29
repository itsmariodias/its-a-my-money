import type { Account, GoalWithDetails, Transaction, Transfer } from '@/types';
import { availableAsOf, overReservedAfterSave } from './goalUtils';

/**
 * Goals that a save just pushed to their target, comparing each goal's `saved` before and after.
 * The below-to-at-or-above edge is strict, so a goal fires once when reached and stays quiet on
 * every later deposit.
 */
export function findReachedGoals(
  prevGoals: readonly Pick<GoalWithDetails, 'id' | 'saved'>[],
  currGoals: GoalWithDetails[],
): GoalWithDetails[] {
  const prevSaved = new Map(prevGoals.map((g) => [g.id, g.saved]));
  return currGoals.filter((g) => {
    if (g.target_amount <= 0) return false;
    const prev = prevSaved.get(g.id) ?? 0;
    return prev < g.target_amount && g.saved >= g.target_amount;
  });
}

/** The data Available is measured from, captured before and after a save. */
export interface BalanceSnapshot {
  transactions: readonly Pick<Transaction, 'account_id' | 'type' | 'amount' | 'date'>[];
  transfers: readonly Pick<Transfer, 'from_account_id' | 'to_account_id' | 'amount' | 'to_amount' | 'date'>[];
  goals: readonly Pick<GoalWithDetails, 'account_id' | 'saved'>[];
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
  const withGoals = new Set(curr.goals.map((g) => g.account_id));
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
