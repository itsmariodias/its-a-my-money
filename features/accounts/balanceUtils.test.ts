import type { Account, Transaction, Transfer } from '@/types';
import {
  accountFlowAsOf,
  accountBalanceAsOf,
  computePnL,
  aggregatePortfolio,
  totalsByCurrency,
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

function transfer(from: number, to: number, amount: number, date: string, to_amount: number | null = null): Transfer {
  return {
    id: Math.random(), from_account_id: from, to_account_id: to, amount, to_amount,
    note: null, date, recurring_transaction_id: null, created_at: date,
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

describe('totalsByCurrency', () => {
  function eurAccount(id: number, initial = 0): Account {
    return { ...cashAccount(id, initial), currency: 'EUR' };
  }

  it('groups balances by currency code', () => {
    const a1 = cashAccount(1, 0); // USD
    const a2 = cashAccount(2, 0); // USD
    const a3 = eurAccount(3, 0);  // EUR
    const balances = { 1: 100, 2: 250, 3: 500 };
    const totals = totalsByCurrency([a1, a2, a3], balances);
    expect(totals).toEqual({ USD: 350, EUR: 500 });
  });

  it('falls back to initial_balance when an account is missing from the balance map', () => {
    const a1 = cashAccount(1, 42);
    const totals = totalsByCurrency([a1], {});
    expect(totals).toEqual({ USD: 42 });
  });

  it('treats a blank currency code as USD so accounts pre-migration still aggregate', () => {
    const a1 = { ...cashAccount(1, 0), currency: '' } as Account;
    const totals = totalsByCurrency([a1], { 1: 10 });
    expect(totals).toEqual({ USD: 10 });
  });

  it('returns an empty object for an empty account list', () => {
    expect(totalsByCurrency([], {})).toEqual({});
  });
});

describe('accountFlowAsOf — cross-currency transfers (to_amount)', () => {
  it('credits the destination with to_amount when set, not the source amount', () => {
    const dest = cashAccount(2, 0);
    const tfr = transfer(1, 2, 100, '2026-03-01', 92.5); // 100 USD sent, 92.5 EUR received
    expect(accountFlowAsOf(dest, [], [tfr])).toBe(92.5);
  });

  it('debits the source with amount regardless of to_amount', () => {
    const src = cashAccount(1, 200);
    const tfr = transfer(1, 2, 100, '2026-03-01', 92.5);
    expect(accountFlowAsOf(src, [], [tfr])).toBe(100); // 200 - 100
  });

  it('still credits the source amount on same-currency transfers (to_amount null)', () => {
    const dest = cashAccount(2, 0);
    const tfr = transfer(1, 2, 50, '2026-03-01'); // to_amount null
    expect(accountFlowAsOf(dest, [], [tfr])).toBe(50);
  });
});
