import type { Goal, Transaction } from '@/types';
import { spentInRange } from '@/features/budgets/periodUtils';

/** Goals have no period end. A future-dated payment is money committed, so it counts. */
const FAR_FUTURE = '9999-12-31';

export const GOAL_REACHED_COLOR = '#4CAF50';
export const GOAL_OVERDUE_COLOR = '#F44336';

export interface GoalProgress {
  /** Amount spent toward the goal since its start date, in the goal's own currency. */
  saved: number;
  /** Percentage of the target reached. Can exceed 100. */
  pct: number;
}

/**
 * How far along a goal is. Progress is the spend in its category from `start_date` onward —
 * the same rule budgets use for a period, with an open-ended window.
 */
export function goalProgress(
  goal: Pick<Goal, 'category_id' | 'target_amount' | 'start_date'>,
  transactions: Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>[],
  currencyFilter?: { currency: string; accountCurrencyById: Record<number, string> },
): GoalProgress {
  const saved = spentInRange(transactions, goal.category_id, goal.start_date, FAR_FUTURE, currencyFilter);
  return {
    saved,
    pct: goal.target_amount > 0 ? (saved / goal.target_amount) * 100 : 0,
  };
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
