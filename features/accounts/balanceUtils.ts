import type { Account, Transaction, Transfer } from '@/types';

type TxLike = Pick<Transaction, 'account_id' | 'type' | 'amount' | 'date'>;
type TransferLike = Pick<Transfer, 'from_account_id' | 'to_account_id' | 'amount' | 'date'>;

/**
 * Sum of money flowing through an account: initial balance + net transactions + net transfers.
 * Filter modes: 'endInclusive' keeps rows with date <= value; 'endExclusive' keeps rows with date < value.
 * Used for cash balance and, on investment accounts, for "invested amount".
 */
export function accountFlowAsOf(
  account: Account,
  transactions: readonly TxLike[],
  transfers: readonly TransferLike[],
  filter?: { endInclusive?: string; endExclusive?: string }
): number {
  const keep = (date: string) => {
    if (filter?.endInclusive !== undefined) return date <= filter.endInclusive;
    if (filter?.endExclusive !== undefined) return date < filter.endExclusive;
    return true;
  };

  const txNet = transactions
    .filter((t) => t.account_id === account.id && keep(t.date))
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  const transferNet = transfers
    .filter((t) => keep(t.date))
    .reduce((sum, t) => {
      if (t.from_account_id === account.id) return sum - t.amount;
      if (t.to_account_id === account.id) return sum + t.amount;
      return sum;
    }, 0);

  return account.initial_balance + txNet + transferNet;
}

/**
 * What the account is "worth". For cash accounts this is the flow;
 * for investment accounts it's the user-entered market value (falls back to flow if unset).
 * `endInclusive` only affects the flow portion — market value is always the latest user-entered value.
 */
export function accountBalanceAsOf(
  account: Account,
  transactions: readonly TxLike[],
  transfers: readonly TransferLike[],
  filter?: { endInclusive?: string; endExclusive?: string },
  opts?: { marketValue?: boolean }
): number {
  const flow = accountFlowAsOf(account, transactions, transfers, filter);
  const useMarket = opts?.marketValue ?? true;
  if (useMarket && account.account_type === 'investment') {
    return account.current_value ?? flow;
  }
  return flow;
}

export interface PnLResult {
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number | null;
}

/**
 * P&L for an investment account: current market value minus invested amount.
 * For non-investment accounts (or when current_value is missing), P&L is zero and pct is null.
 */
export function computePnL(
  account: Account,
  transactions: readonly TxLike[],
  transfers: readonly TransferLike[],
  filter?: { endInclusive?: string; endExclusive?: string }
): PnLResult {
  const invested = accountFlowAsOf(account, transactions, transfers, filter);
  const current = account.account_type === 'investment' && account.current_value !== null
    ? account.current_value
    : invested;
  const pnl = current - invested;
  const pnlPct = invested === 0 ? null : (pnl / Math.abs(invested)) * 100;
  return { invested, current, pnl, pnlPct };
}

/**
 * Aggregate P&L across the investment accounts in a list.
 * `filter` scopes the invested-amount calc to a date range end.
 */
export function aggregatePortfolio(
  accounts: readonly Account[],
  transactions: readonly TxLike[],
  transfers: readonly TransferLike[],
  filter?: { endInclusive?: string; endExclusive?: string }
): PnLResult & { count: number } {
  let invested = 0;
  let current = 0;
  let count = 0;
  for (const acc of accounts) {
    if (acc.account_type !== 'investment') continue;
    const r = computePnL(acc, transactions, transfers, filter);
    invested += r.invested;
    current += r.current;
    count += 1;
  }
  const pnl = current - invested;
  const pnlPct = invested === 0 ? null : (pnl / Math.abs(invested)) * 100;
  return { invested, current, pnl, pnlPct, count };
}
