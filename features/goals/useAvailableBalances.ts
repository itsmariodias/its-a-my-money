import { useMemo } from 'react';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { todayString } from '@/features/recurring/dateUtils';
import { useGoalsStore } from './useGoalsStore';
import { availableAsOf } from './goalUtils';

/**
 * Each account's balance today minus what its goals hold, keyed by account id — the money not yet
 * set aside. Future-dated income does not count until its day, so it cannot be reserved early.
 */
export function useAvailableBalances(): Record<number, number> {
  const accounts = useAccountsStore((s) => s.accounts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const goals = useGoalsStore((s) => s.goals);

  const today = todayString();

  return useMemo(() => {
    const available: Record<number, number> = {};
    for (const acc of accounts) {
      available[acc.id] = availableAsOf(acc, transactions, transfers, goals, today);
    }
    return available;
  }, [accounts, transactions, transfers, goals, today]);
}
