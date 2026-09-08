import type { Account } from '@/types';

/** Currency of the given account, falling back to the global default when unresolved. */
export function getAccountCurrency(
  accounts: Account[],
  accountId: number | null | undefined,
  fallback: string,
): string {
  if (accountId == null) return fallback;
  return accounts.find((a) => a.id === accountId)?.currency || fallback;
}

/** accountId -> currency map, for row components that render many accounts' amounts. */
export function buildAccountCurrencyMap(
  accounts: Account[],
  fallback: string,
): Record<number, string> {
  const map: Record<number, string> = {};
  for (const a of accounts) map[a.id] = a.currency || fallback;
  return map;
}
