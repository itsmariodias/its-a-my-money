import type { GoalWithDetails } from '@/types';

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
