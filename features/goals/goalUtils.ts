import type { GoalAllocation, GoalSplit, GoalWithDetails } from '@/types';

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

/** Money set aside in goals, per account id. An account's available balance is its balance minus this. */
export function reservedByAccount(
  goals: readonly Pick<GoalWithDetails, 'account_id' | 'saved'>[],
): Record<number, number> {
  const reserved: Record<number, number> = {};
  for (const g of goals) {
    reserved[g.account_id] = (reserved[g.account_id] ?? 0) + g.saved;
  }
  return reserved;
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

/** "12 days left" / "4 months left" / "Overdue", or null when the goal has no deadline. */
export function targetDateLabel(targetDate: string | null, today: string): string | null {
  if (!targetDate) return null;
  if (targetDate < today) return 'Overdue';

  const days = daysBetween(today, targetDate);
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  // 30 days out is a month away, not "30 days left".
  if (days < 30) return `${days} days left`;

  const months = Math.round(days / 30);
  return months === 1 ? '1 month left' : `${months} months left`;
}

function daysBetween(from: string, to: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // Parsed as UTC midnight on both sides, so DST never shifts the difference.
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}
