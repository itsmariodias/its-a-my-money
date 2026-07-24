import type { RecurringTransactionWithDetails } from '@/types';
import { getRecurringItemCurrency } from './recurringUtils';

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
