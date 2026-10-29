import { useMemo } from 'react';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { accountBalanceAsOf } from '@/features/accounts/balanceUtils';
import { useGoalsStore } from './useGoalsStore';
import { reservedByAccount } from './goalUtils';

/**
 * Each account's balance minus what its goals hold, keyed by account id — the money not yet set
 * aside. All-time, not period-filtered: this is what can be reserved right now.
 */
export function useAvailableBalances(): Record<number, number> {
  const accounts = useAccountsStore((s) => s.accounts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const goals = useGoalsStore((s) => s.goals);

  return useMemo(() => {
    const reserved = reservedByAccount(goals);
    const available: Record<number, number> = {};
    for (const acc of accounts) {
      available[acc.id] = accountBalanceAsOf(acc, transactions, transfers) - (reserved[acc.id] ?? 0);
    }
    return available;
  }, [accounts, transactions, transfers, goals]);
}
