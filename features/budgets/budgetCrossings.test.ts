import { findCrossings } from './budgetCrossings';
import type { BudgetWithDetails } from '@/types';

const makeBudget = (overrides: Partial<BudgetWithDetails> = {}): BudgetWithDetails => ({
  id: 1,
  category_id: 1,
  amount: 100,
  period: 'monthly',
  currency: 'USD',
  created_at: '2026-01-01T00:00:00.000Z',
  category_name: 'Food',
  category_color: '#4CAF50',
  category_icon: 'local-grocery-store',
  ...overrides,
});

const today = new Date(2026, 5, 10); // June 10, 2026

describe('findCrossings', () => {
  it('flags a budget that crossed from under to over the limit', () => {
    // Given a $100 monthly budget with $90 spent so far this month
    const budget = makeBudget({ amount: 100 });
    const prev = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 90, date: '2026-06-05' }];
    // When a new $20 expense pushes total to $110
    const curr = [
      ...prev,
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 20, date: '2026-06-10' },
    ];
    // Then the budget is flagged
    expect(findCrossings([budget], prev, curr, today)).toEqual([budget]);
  });

  it('does not flag a budget that was already over', () => {
    // Given a budget already at 150% of limit
    const budget = makeBudget({ amount: 100 });
    const prev = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 150, date: '2026-06-05' }];
    // When another expense adds more
    const curr = [
      ...prev,
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 10, date: '2026-06-10' },
    ];
    // Then no crossing event fires
    expect(findCrossings([budget], prev, curr, today)).toEqual([]);
  });

  it('does not flag a budget that stays under the limit', () => {
    const budget = makeBudget({ amount: 100 });
    const prev = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 30, date: '2026-06-05' }];
    const curr = [
      ...prev,
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 10, date: '2026-06-10' },
    ];
    expect(findCrossings([budget], prev, curr, today)).toEqual([]);
  });

  it('flags exactly at 100%', () => {
    const budget = makeBudget({ amount: 100 });
    const prev = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 90, date: '2026-06-05' }];
    const curr = [
      ...prev,
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 10, date: '2026-06-10' },
    ];
    expect(findCrossings([budget], prev, curr, today)).toEqual([budget]);
  });

  it('ignores expenses in a different category', () => {
    const budget = makeBudget({ category_id: 1, amount: 100 });
    const prev: any[] = [];
    const curr = [{ type: 'expense' as const, category_id: 2, account_id: 1, amount: 500, date: '2026-06-10' }];
    expect(findCrossings([budget], prev, curr, today)).toEqual([]);
  });

  it('ignores transactions outside the current period', () => {
    const budget = makeBudget({ amount: 100, period: 'monthly' });
    const prev: any[] = [];
    const curr = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 500, date: '2026-05-31' }];
    expect(findCrossings([budget], prev, curr, today)).toEqual([]);
  });

  it('ignores budgets with zero or negative limit', () => {
    const budget = makeBudget({ amount: 0 });
    const prev: any[] = [];
    const curr = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 10, date: '2026-06-10' }];
    expect(findCrossings([budget], prev, curr, today)).toEqual([]);
  });
});

describe('findCrossings — currency filter', () => {
  it('only flags a budget when crossings come from accounts of the budget\'s currency', () => {
    const usdBudget = makeBudget({ id: 1, category_id: 1, amount: 100, currency: 'USD' });
    const accountCurrencyById = { 1: 'USD', 2: 'EUR' };
    // prev: 90 USD spent; curr: 90 USD + 50 EUR — the EUR spend should NOT push USD budget over.
    const prev = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 90, date: '2026-06-05' }];
    const curr = [
      ...prev,
      { type: 'expense' as const, category_id: 1, account_id: 2, amount: 50, date: '2026-06-10' },
    ];
    expect(findCrossings([usdBudget], prev, curr, today, accountCurrencyById)).toEqual([]);
  });

  it('flags a USD budget when a USD account expense pushes it over', () => {
    const usdBudget = makeBudget({ id: 1, category_id: 1, amount: 100, currency: 'USD' });
    const accountCurrencyById = { 1: 'USD', 2: 'EUR' };
    const prev = [{ type: 'expense' as const, category_id: 1, account_id: 1, amount: 90, date: '2026-06-05' }];
    const curr = [
      ...prev,
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 20, date: '2026-06-10' },
    ];
    expect(findCrossings([usdBudget], prev, curr, today, accountCurrencyById)).toEqual([usdBudget]);
  });
});
