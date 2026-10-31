/** Spend at or above this share of a budget is a warning: amber bar, and a heads-up notification. */
export const BUDGET_WARNING_PCT = 80;

export const BUDGET_OK_COLOR = '#4CAF50';
export const BUDGET_WARNING_COLOR = '#FFC107';
export const BUDGET_OVER_COLOR = '#F44336';

/** Green under the warning line, amber from it, red at or over the limit. */
export function budgetStatusColor(pct: number): string {
  if (pct >= 100) return BUDGET_OVER_COLOR;
  if (pct >= BUDGET_WARNING_PCT) return BUDGET_WARNING_COLOR;
  return BUDGET_OK_COLOR;
}
