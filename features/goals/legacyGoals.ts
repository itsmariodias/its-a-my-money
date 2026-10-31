import type { Account, Category, Goal } from '@/types';

/** The goal shape written by backups before goals became savings buckets (migration 016). */
export interface LegacyGoal {
  id: number;
  category_id: number;
  target_amount: number;
  currency: string;
  start_date: string;
  target_date: string | null;
  created_at: string;
}

export function isLegacyGoal(goal: Goal | LegacyGoal): goal is LegacyGoal {
  return !('account_id' in goal) && 'category_id' in goal;
}

const FALLBACK_NAME = 'Goal';
const FALLBACK_ICON = 'savings';
const FALLBACK_COLOR = '#009688';

/**
 * Converts an old category-based goal from a backup, by the same rule as migration 016: the
 * category's name, icon and colour carry over, and the goal lands in the first account of its
 * currency, else the first account of any. Returns null when there is no account to put it in.
 * Old spend-based progress does not carry over — the converted goal starts empty.
 */
export function convertLegacyGoal(
  legacy: LegacyGoal,
  categories: readonly Pick<Category, 'id' | 'name' | 'icon' | 'color'>[],
  accounts: readonly Pick<Account, 'id' | 'currency'>[],
): Omit<Goal, 'id'> | null {
  const byId = [...accounts].sort((a, b) => a.id - b.id);
  const account = byId.find((a) => a.currency === legacy.currency) ?? byId[0];
  if (!account) return null;

  const category = categories.find((c) => c.id === legacy.category_id);
  return {
    name: category?.name ?? FALLBACK_NAME,
    icon: category?.icon ?? FALLBACK_ICON,
    color: category?.color ?? FALLBACK_COLOR,
    account_id: account.id,
    target_amount: legacy.target_amount,
    target_date: legacy.target_date ?? null,
    archived_at: null,
    created_at: legacy.created_at,
  };
}
