import { differenceInMonths } from 'date-fns';
import type { Account, GoalAllocation, GoalSplit, GoalWithDetails, Transaction, Transfer } from '@/types';
import { accountBalanceAsOf } from '@/features/accounts/balanceUtils';
import { daysBetween, parseDay } from '@/shared/dates';

type TxLike = Pick<Transaction, 'account_id' | 'type' | 'amount' | 'date'>;
type TransferLike = Pick<Transfer, 'from_account_id' | 'to_account_id' | 'amount' | 'to_amount' | 'date'>;
/** What counting reserved money needs from a goal. `archived_at` is optional so plain fixtures fit. */
export type ReservableGoal = Pick<GoalWithDetails, 'account_id' | 'saved'> & Partial<Pick<GoalWithDetails, 'archived_at'>>;

/** A goal still being saved for, as opposed to one marked complete. */
export function isActiveGoal(goal: Partial<Pick<GoalWithDetails, 'archived_at'>>): boolean {
  return goal.archived_at == null;
}

export const GOAL_REACHED_COLOR = '#4CAF50';
export const GOAL_OVERDUE_COLOR = '#F44336';

/** Amounts are floats typed by hand; ignore sub-cent rounding drift when comparing. */
const EPSILON = 0.005;

export interface GoalProgress {
  /** Money currently set aside in the goal, in its account's currency. */
  saved: number;
  /** Percentage of the target reached. Can exceed 100. */
  pct: number;
}

/** How full a goal's bucket is. `saved` is the sum of its allocations, computed in SQL. */
export function goalProgress(goal: Pick<GoalWithDetails, 'saved' | 'target_amount'>): GoalProgress {
  return {
    saved: goal.saved,
    pct: goal.target_amount > 0 ? (goal.saved / goal.target_amount) * 100 : 0,
  };
}

/**
 * Money set aside in goals, per account id. An account's available balance is its balance minus
 * this. Completed (archived) goals no longer hold their money, so they are skipped.
 */
export function reservedByAccount(goals: readonly ReservableGoal[]): Record<number, number> {
  const reserved: Record<number, number> = {};
  for (const g of goals) {
    if (!isActiveGoal(g)) continue;
    reserved[g.account_id] = (reserved[g.account_id] ?? 0) + g.saved;
  }
  return reserved;
}

/**
 * An account's balance on `asOf` minus what its goals hold — the money not set aside. Every
 * Available figure in the app is measured this way, as of today, so the cap on Add money and the
 * figures on screen agree. `reservedDelta` is extra money a pending save would set aside.
 */
export function availableAsOf(
  account: Account,
  transactions: readonly TxLike[],
  transfers: readonly TransferLike[],
  goals: readonly ReservableGoal[],
  asOf: string,
  reservedDelta = 0,
): number {
  const balance = accountBalanceAsOf(account, transactions, transfers, { endInclusive: asOf });
  return balance - (reservedByAccount(goals)[account.id] ?? 0) - reservedDelta;
}

/**
 * The projected Available when a save would leave it below zero, or null. Only a save that
 * lowers Available counts, so editing the note on a transaction in an already-negative account
 * does not keep warning.
 */
export function overReservedAfterSave(availableBefore: number, availableAfter: number): number | null {
  return availableAfter < -EPSILON && availableAfter < availableBefore - EPSILON ? availableAfter : null;
}

/**
 * What goals hold across a set of accounts, from a `reservedByAccount` map. Undefined when none
 * of them has a goal, so callers can hide a Reserved line rather than show "Reserved 0".
 */
export function reservedAcross(
  reserved: Record<number, number>,
  accountIds: readonly number[],
): number | undefined {
  let total: number | undefined;
  for (const id of accountIds) {
    if (reserved[id] !== undefined) total = (total ?? 0) + reserved[id];
  }
  return total;
}

/**
 * Each goal's saved amount with a set of allocations taken back out — the transaction being
 * edited, whose old splits are already counted in `saved` and are about to be replaced.
 */
export function savedExcluding(
  goals: readonly Pick<GoalWithDetails, 'id' | 'saved'>[],
  allocations: readonly Pick<GoalAllocation, 'goal_id' | 'amount'>[],
): Record<number, number> {
  const saved: Record<number, number> = {};
  for (const g of goals) saved[g.id] = g.saved;
  for (const a of allocations) {
    if (a.goal_id in saved) saved[a.goal_id] -= a.amount;
  }
  return saved;
}

export type GoalSplitMode = 'reserve' | 'spend';

export interface SplitErrors {
  /** Error for the split as a whole, e.g. more split out than the transaction is worth. */
  total: string | null;
  /** Error per goal id. */
  byGoal: Record<number, string>;
}

/**
 * Checks a transaction's goal splits. Together they can never exceed the transaction amount. When
 * spending, each split is also capped by what the goal holds — a bucket cannot go below empty.
 * Reserving needs no per-goal cap: the income itself raises the account's available balance by
 * at least as much as is reserved from it.
 */
export function validateSplits(
  mode: GoalSplitMode,
  splits: readonly GoalSplit[],
  transactionAmount: number,
  savedByGoal: Record<number, number>,
): SplitErrors {
  const byGoal: Record<number, string> = {};
  if (mode === 'spend') {
    for (const s of splits) {
      if (s.amount > (savedByGoal[s.goal_id] ?? 0) + EPSILON) byGoal[s.goal_id] = 'More than this goal holds';
    }
  }
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  const total = sum > transactionAmount + EPSILON
    ? (mode === 'reserve' ? 'Goals get more than this income' : 'Goals pay more than this expense')
    : null;
  return { total, byGoal };
}

export function hasSplitErrors(errors: SplitErrors): boolean {
  return errors.total != null || Object.keys(errors.byGoal).length > 0;
}

export type GoalMoveDirection = 'add' | 'release';

/**
 * Checks a manual move. Adding is capped by the account's available balance — money already in
 * another goal cannot be reserved twice. Releasing is capped by what the goal holds.
 */
export function moveError(
  direction: GoalMoveDirection,
  amount: number,
  goalSaved: number,
  accountAvailable: number,
): string | null {
  if (direction === 'add' && amount > accountAvailable + EPSILON) return 'More than the account has available';
  if (direction === 'release' && amount > goalSaved + EPSILON) return 'More than this goal holds';
  return null;
}

/**
 * Reaching the target is the win, so the colours invert the budget thresholds: green on
 * completion, red only when the deadline has passed with the goal unmet. `accentColor` carries
 * the in-progress case so the caller's theme decides it.
 */
export function goalStatusColor(
  pct: number,
  targetDate: string | null,
  accentColor: string,
  today: string,
): string {
  if (pct >= 100) return GOAL_REACHED_COLOR;
  if (targetDate && targetDate < today) return GOAL_OVERDUE_COLOR;
  return accentColor;
}

/**
 * What to set aside each month to reach the target by its date: the rest of the target spread
 * over the months left, counted as a fraction (45 days is about 1.5 months). Null when there is
 * no date, the goal is already reached, or the date has passed. Inside the last month the whole
 * remainder is due, so it never asks for more than what is left.
 */
export function monthlyNeeded(
  goal: Pick<GoalWithDetails, 'saved' | 'target_amount' | 'target_date'>,
  today: string,
): number | null {
  if (!goal.target_date || goal.target_date < today) return null;
  const remaining = goal.target_amount - goal.saved;
  if (remaining <= EPSILON) return null;
  const months = daysBetween(today, goal.target_date) / DAYS_PER_MONTH;
  return remaining / Math.max(1, months);
}

/** Average month length, so "months left" does not depend on which months they are. */
const DAYS_PER_MONTH = 365.25 / 12;

/** "12 days left" / "4 months left" / "Overdue", or null when the goal has no deadline. */
export function targetDateLabel(targetDate: string | null, today: string): string | null {
  if (!targetDate) return null;
  if (targetDate < today) return 'Overdue';

  const days = daysBetween(today, targetDate);
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';

  // Whole calendar months, so Jun 1 → Jul 1 is "1 month left" and Jul 1 → Jul 31 is "30 days left".
  const months = differenceInMonths(parseDay(targetDate), parseDay(today));
  if (months === 0) return `${days} days left`;
  return months === 1 ? '1 month left' : `${months} months left`;
}
