import type { TransactionWithDetails, TransferWithDetails } from '@/types';
import { getSectionAmountColor, getSectionCurrencySummary, type TransactionListItem } from './sectionUtils';

const makeTx = (overrides: Partial<TransactionWithDetails> = {}): TransactionWithDetails => ({
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
  account_currency: 'EUR',
  ...overrides,
});

const makeTransfer = (overrides: Partial<TransferWithDetails> = {}): TransferWithDetails => ({
  id: 1,
  from_account_id: 1,
  to_account_id: 2,
  amount: 100,
  to_amount: null,
  note: null,
  date: '2026-01-01',
  recurring_transaction_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  from_account_name: 'Checking',
  from_account_color: null,
  from_account_icon: null,
  from_account_currency: 'EUR',
  to_account_name: 'Savings',
  to_account_color: null,
  to_account_icon: null,
  to_account_currency: 'EUR',
  ...overrides,
});

describe('getSectionCurrencySummary', () => {
  it('returns a single currency total when all rows share the same currency', () => {
    // Given an income and an expense on the same euro account
    const items: TransactionListItem[] = [
      { kind: 'tx', item: makeTx({ id: 1, amount: 100, type: 'income' }) },
      { kind: 'tx', item: makeTx({ id: 2, amount: 50, type: 'expense', category_name: 'Food' }) },
    ];

    // When summarising the section
    // Then the two net out under one currency
    expect(getSectionCurrencySummary(items, 1, 'USD')).toEqual([{ currency: 'EUR', net: 50 }]);
  });

  it('returns one summary entry per currency for mixed-currency sections', () => {
    // Given rows on accounts held in different currencies
    const items: TransactionListItem[] = [
      { kind: 'tx', item: makeTx({ id: 1, amount: 100, type: 'income', account_currency: 'EUR' }) },
      { kind: 'tx', item: makeTx({ id: 2, amount: 50, type: 'expense', account_id: 2, account_currency: 'JPY' }) },
    ];

    // When summarising with no account selected
    const summary = getSectionCurrencySummary(items, null, 'USD');

    // Then each currency keeps its own subtotal — nothing is converted
    expect(summary).toEqual([
      { currency: 'EUR', net: 100 },
      { currency: 'JPY', net: -50 },
    ]);
    expect(getSectionAmountColor(summary[0].net)).toBe('#4CAF50');
    expect(getSectionAmountColor(summary[1].net)).toBe('#F44336');
  });

  it('counts a transfer against the side of the selected account', () => {
    // Given a cross-currency transfer out of account 1 (EUR) into account 2 (JPY)
    const items: TransactionListItem[] = [
      {
        kind: 'transfer',
        item: makeTransfer({ amount: 100, to_amount: 16000, to_account_currency: 'JPY' }),
      },
    ];

    // When viewing from the source account, the euro amount is debited
    expect(getSectionCurrencySummary(items, 1, 'USD')).toEqual([{ currency: 'EUR', net: -100 }]);

    // And when viewing from the destination, the yen amount is credited
    expect(getSectionCurrencySummary(items, 2, 'USD')).toEqual([{ currency: 'JPY', net: 16000 }]);
  });

  it('ignores transfers when no account is selected', () => {
    // Given a transfer and no selected account, there is no side to view it from
    const items: TransactionListItem[] = [{ kind: 'transfer', item: makeTransfer() }];

    // When summarising
    // Then the transfer contributes nothing
    expect(getSectionCurrencySummary(items, null, 'USD')).toEqual([]);
  });

  it('falls back to the given currency when the row account was deleted', () => {
    // Given a transfer whose destination account has been deleted (ON DELETE SET NULL)
    const items: TransactionListItem[] = [
      { kind: 'transfer', item: makeTransfer({ to_account_id: null, to_account_name: null, to_account_currency: null }) },
      // And a legacy transaction row with no currency on its account
      { kind: 'tx', item: makeTx({ id: 9, account_currency: '' }) },
    ];

    // When summarising from the deleted side
    const summary = getSectionCurrencySummary(items, 2, 'USD');

    // Then both fall back rather than dropping out
    expect(summary).toEqual([{ currency: 'USD', net: 200 }]);
  });
});
