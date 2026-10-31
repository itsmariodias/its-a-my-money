import type { RecurringTransactionWithDetails } from '@/types';
import { expandOccurrences, getRecurringItemCurrency, type RecurringTemplate } from './recurringUtils';

describe('getRecurringItemCurrency', () => {
  it('returns the account currency when present', () => {
    const item = {
      id: 1,
      amount: 100,
      kind: 'transaction',
      type: 'expense',
      category_id: 1,
      account_id: 1,
      to_account_id: null,
      note: null,
      frequency: 'monthly',
      start_date: '2025-01-01',
      end_date: null,
      next_due_date: '2025-02-01',
      is_active: 1,
      created_at: '2025-01-01T00:00:00.000Z',
      category_name: 'Bills',
      category_color: '#607D8B',
      category_icon: 'receipt',
      account_name: 'Cash',
      account_currency: 'EUR',
      to_account_name: null,
      to_account_color: null,
      to_account_icon: null,
      to_account_currency: null,
    } as RecurringTransactionWithDetails;

    expect(getRecurringItemCurrency(item, 'USD')).toBe('EUR');
  });

  it('falls back to default currency when the account currency is missing', () => {
    const item = {
      id: 2,
      amount: 200,
      kind: 'transaction',
      type: 'income',
      category_id: 2,
      account_id: 2,
      to_account_id: null,
      note: null,
      frequency: 'monthly',
      start_date: '2025-01-01',
      end_date: null,
      next_due_date: '2025-02-01',
      is_active: 1,
      created_at: '2025-01-01T00:00:00.000Z',
      category_name: 'Salary',
      category_color: '#4CAF50',
      category_icon: 'attach-money',
      account_name: 'Savings',
      account_currency: '',
      to_account_name: null,
      to_account_color: null,
      to_account_icon: null,
      to_account_currency: null,
    } as RecurringTransactionWithDetails;

    expect(getRecurringItemCurrency(item, 'USD')).toBe('USD');
  });
});

describe('expandOccurrences', () => {
  const template = (overrides: Partial<RecurringTemplate>): RecurringTemplate => ({
    amount: 100,
    kind: 'transaction',
    type: 'expense',
    category_id: 1,
    account_id: 1,
    to_account_id: null,
    frequency: 'monthly',
    end_date: null,
    next_due_date: '2026-01-31',
    is_active: 1,
    ...overrides,
  });

  it('steps a monthly item with month-end clamping', () => {
    // Given rent due on the 31st
    const dates = expandOccurrences([template({})], '2026-01-01', '2026-04-30').map((o) => o.date);
    // Then February clamps to the 28th and later months stay clamped (advanceDate carries the day)
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-28', '2026-04-28']);
  });

  it('skips paused items', () => {
    expect(expandOccurrences([template({ is_active: 0 })], '2026-01-01', '2026-12-31')).toEqual([]);
  });

  it('stops at the end date', () => {
    // Given an item that ends in March
    const dates = expandOccurrences(
      [template({ next_due_date: '2026-01-15', end_date: '2026-03-15' })],
      '2026-01-01',
      '2026-12-31',
    ).map((o) => o.date);
    expect(dates).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
  });

  it('leaves out occurrences before the window but still steps through them', () => {
    // Given a weekly item whose next due date is before the window
    const dates = expandOccurrences(
      [template({ frequency: 'weekly', next_due_date: '2026-01-01' })],
      '2026-01-10',
      '2026-01-20',
    ).map((o) => o.date);
    expect(dates).toEqual(['2026-01-15']);
  });

  it('expands a daily item over a long range and sorts across items', () => {
    // Given a daily item and a yearly one over a full year
    const occurrences = expandOccurrences(
      [template({ frequency: 'yearly', next_due_date: '2026-06-01', amount: 5 }), template({ frequency: 'daily', next_due_date: '2026-01-01' })],
      '2026-01-01',
      '2026-12-31',
    );
    // Then there are 365 daily rows plus the yearly one, in date order
    expect(occurrences).toHaveLength(366);
    expect(occurrences.map((o) => o.date)).toEqual([...occurrences.map((o) => o.date)].sort());
  });
});
