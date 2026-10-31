import { useMemo } from 'react';
import type { PeriodMode } from '@/shared/periodUtils';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { monthKeyOf, todayString } from '@/shared/dates';
import { cashflowSummary, monthlyCashflow, trendEndMonth, type MonthlyCashflow } from './forecastUtils';

export interface CashflowTrend {
  rows: MonthlyCashflow[];
  summary: { avgNet: number; savingsRate: number | null };
  currentMonth: string; // YYYY-MM
}

/**
 * Monthly income vs expense for `accountIds`: the twelve months of the year in year mode, else
 * the six months up to the selected one. With `selectedAccountId`, also that account's transfers
 * in and out. Null when none of those months has any activity.
 */
export function useCashflowTrend(
  accountIds: readonly number[],
  selectedAccountId: number | null,
  periodMode: PeriodMode,
  periodDate: Date,
): CashflowTrend | null {
  const transactions = useTransactionsStore((s) => s.transactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const endMonth = trendEndMonth(periodMode, periodDate);
  const monthCount = periodMode === 'year' ? 12 : 6;
  const currentMonth = monthKeyOf(todayString());

  return useMemo(() => {
    const transferView = selectedAccountId !== null ? { transfers, accountId: selectedAccountId } : undefined;
    const rows = monthlyCashflow(transactions, new Set(accountIds), endMonth, monthCount, transferView);
    const summary = cashflowSummary(rows, currentMonth);
    return summary === null ? null : { rows, summary, currentMonth };
  }, [transactions, transfers, accountIds, selectedAccountId, endMonth, monthCount, currentMonth]);
}
