import type { TransactionWithDetails, TransferWithDetails } from '@/types';
import { getSectionAmountColor, getSectionCurrencySummary } from './sectionUtils';

describe('getSectionCurrencySummary', () => {
  it('returns a single currency total when all rows share the same currency', () => {
    const items: Array<{ kind: 'tx'; item: TransactionWithDetails } | { kind: 'transfer'; item: TransferWithDetails }> = [
      {
        kind: 'tx',
        item: {
          id: 1,
          amount: 100,
          type: 'income',
          category_id: 1,
          account_id: 1,
          note: null,
          date: '2026-01-01',
          recurring_transaction_id: null,
          created_at: '2026-01-01T00:00:00.000Z',
          category_name: 'Salary',
          category_color: '#4CAF50',
          category_icon: 'attach-money',
          account_name: 'Checking',
        },
      },
      {
        kind: 'tx',
        item: {
          id: 2,
          amount: 50,
          type: 'expense',
          category_id: 2,
          account_id: 1,
          note: 'Lunch',
          date: '2026-01-02',
          recurring_transaction_id: null,
          created_at: '2026-01-02T00:00:00.000Z',
          category_name: 'Food',
          category_color: '#F44336',
          category_icon: 'restaurant',
          account_name: 'Checking',
        },
      },
    ];

    expect(getSectionCurrencySummary(items, 1, { 1: 'EUR' }, 'USD')).toEqual([{ currency: 'EUR', net: 50 }]);
  });

  it('returns one summary entry per currency for mixed-currency sections', () => {
    const items: Array<{ kind: 'tx'; item: TransactionWithDetails } | { kind: 'transfer'; item: TransferWithDetails }> = [
      {
        kind: 'tx',
        item: {
          id: 1,
          amount: 100,
          type: 'income',
          category_id: 1,
          account_id: 1,
          note: null,
          date: '2026-01-01',
          recurring_transaction_id: null,
          created_at: '2026-01-01T00:00:00.000Z',
          category_name: 'Salary',
          category_color: '#4CAF50',
          category_icon: 'attach-money',
          account_name: 'Checking',
        },
      },
      {
        kind: 'tx',
        item: {
          id: 2,
          amount: 50,
          type: 'expense',
          category_id: 2,
          account_id: 2,
          note: 'Coffee',
          date: '2026-01-02',
          recurring_transaction_id: null,
          created_at: '2026-01-02T00:00:00.000Z',
          category_name: 'Food',
          category_color: '#F44336',
          category_icon: 'coffee',
          account_name: 'Savings',
        },
      },
    ];

    const summary = getSectionCurrencySummary(items, null, { 1: 'EUR', 2: 'JPY' }, 'USD');

    expect(summary).toEqual([
      { currency: 'EUR', net: 100 },
      { currency: 'JPY', net: -50 },
    ]);
    expect(getSectionAmountColor(summary[0].net)).toBe('#4CAF50');
    expect(getSectionAmountColor(summary[1].net)).toBe('#F44336');
  });
});
