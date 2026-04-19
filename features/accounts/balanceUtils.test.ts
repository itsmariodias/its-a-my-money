import type { Account, Transaction, Transfer } from '@/types';
import {
  accountFlowAsOf,
  accountBalanceAsOf,
  computePnL,
  aggregatePortfolio,
} from './balanceUtils';

function cashAccount(id: number, initial = 0): Account {
  return {
    id, name: `Cash${id}`, initial_balance: initial, currency: 'USD',
    color: null, icon: null, account_type: 'cash', current_value: null,
    created_at: '2025-01-01',
  };
}

function investmentAccount(id: number, initial = 0, currentValue: number | null = null): Account {
  return {
    id, name: `Inv${id}`, initial_balance: initial, currency: 'USD',
    color: null, icon: null, account_type: 'investment', current_value: currentValue,
    created_at: '2025-01-01',
  };
}

function tx(accountId: number, type: 'income' | 'expense', amount: number, date: string): Transaction {
  return {
    id: Math.random(), amount, type, category_id: 1, account_id: accountId,
    note: null, date, recurring_transaction_id: null, created_at: date,
  };
}

function transfer(from: number, to: number, amount: number, date: string): Transfer {
  return {
    id: Math.random(), from_account_id: from, to_account_id: to, amount,
    note: null, date, created_at: date,
  };
}

describe('accountFlowAsOf', () => {
  it('returns initial balance when there are no movements', () => {
    const acc = cashAccount(1, 100);
    expect(accountFlowAsOf(acc, [], [])).toBe(100);
  });

  it('adds income and subtracts expenses', () => {
    const acc = cashAccount(1, 100);
    const transactions = [tx(1, 'income', 50, '2026-01-05'), tx(1, 'expense', 30, '2026-01-10')];
    expect(accountFlowAsOf(acc, transactions, [])).toBe(120);
  });

  it('tracks transfers in and out', () => {
    const acc = cashAccount(1, 100);
    const transfers = [transfer(2, 1, 40, '2026-01-03'), transfer(1, 3, 25, '2026-01-08')];
    expect(accountFlowAsOf(acc, [], transfers)).toBe(115);
  });

  it('honors endInclusive filter', () => {
    const acc = cashAccount(1, 0);
    const transactions = [tx(1, 'income', 10, '2026-01-01'), tx(1, 'income', 20, '2026-02-01')];
    expect(accountFlowAsOf(acc, transactions, [], { endInclusive: '2026-01-31' })).toBe(10);
  });

  it('honors endExclusive filter', () => {
    const acc = cashAccount(1, 0);
    const transactions = [tx(1, 'income', 10, '2026-01-01'), tx(1, 'income', 20, '2026-02-01')];
    expect(accountFlowAsOf(acc, transactions, [], { endExclusive: '2026-02-01' })).toBe(10);
  });
});

describe('accountBalanceAsOf', () => {
  it('returns flow for cash accounts', () => {
    const acc = cashAccount(1, 100);
    expect(accountBalanceAsOf(acc, [tx(1, 'income', 50, '2026-01-05')], [])).toBe(150);
  });

  it('returns current_value for investment accounts when set', () => {
    const acc = investmentAccount(1, 1000, 1200);
    expect(accountBalanceAsOf(acc, [], [])).toBe(1200);
  });

  it('falls back to flow for investment accounts when current_value is null', () => {
    const acc = investmentAccount(1, 1000, null);
    expect(accountBalanceAsOf(acc, [], [])).toBe(1000);
  });

  it('returns flow for investment accounts when marketValue option is false', () => {
    const acc = investmentAccount(1, 1000, 1500);
    expect(accountBalanceAsOf(acc, [], [], undefined, { marketValue: false })).toBe(1000);
  });
});

describe('computePnL', () => {
  it('computes positive P&L', () => {
    const acc = investmentAccount(1, 1000, 1200);
    const r = computePnL(acc, [], []);
    expect(r).toEqual({ invested: 1000, current: 1200, pnl: 200, pnlPct: 20 });
  });

  it('computes negative P&L', () => {
    const acc = investmentAccount(1, 1000, 800);
    const r = computePnL(acc, [], []);
    expect(r.pnl).toBe(-200);
    expect(r.pnlPct).toBe(-20);
  });

  it('factors transfers into invested amount', () => {
    const acc = investmentAccount(1, 1000, 1500);
    const transfers = [transfer(2, 1, 200, '2026-02-01')];
    const r = computePnL(acc, [], transfers);
    expect(r.invested).toBe(1200);
    expect(r.pnl).toBe(300);
    expect(r.pnlPct).toBeCloseTo(25);
  });

  it('returns zero P&L when current_value missing', () => {
    const acc = investmentAccount(1, 1000, null);
    const r = computePnL(acc, [], []);
    expect(r).toEqual({ invested: 1000, current: 1000, pnl: 0, pnlPct: 0 });
  });

  it('returns null pct when invested is zero', () => {
    const acc = investmentAccount(1, 0, 100);
    const r = computePnL(acc, [], []);
    expect(r.pnlPct).toBeNull();
  });

  it('returns zero P&L for cash accounts regardless of current_value', () => {
    const acc = cashAccount(1, 500);
    const r = computePnL(acc, [], []);
    expect(r.invested).toBe(500);
    expect(r.current).toBe(500);
    expect(r.pnl).toBe(0);
  });
});

describe('aggregatePortfolio', () => {
  it('sums investment accounts only', () => {
    const cash = cashAccount(1, 5000);
    const inv1 = investmentAccount(2, 1000, 1200);
    const inv2 = investmentAccount(3, 2000, 1800);
    const r = aggregatePortfolio([cash, inv1, inv2], [], []);
    expect(r.count).toBe(2);
    expect(r.invested).toBe(3000);
    expect(r.current).toBe(3000);
    expect(r.pnl).toBe(0);
    expect(r.pnlPct).toBe(0);
  });

  it('returns zeros and null pct when there are no investment accounts', () => {
    const r = aggregatePortfolio([cashAccount(1, 100)], [], []);
    expect(r.count).toBe(0);
    expect(r.invested).toBe(0);
    expect(r.pnlPct).toBeNull();
  });
});
