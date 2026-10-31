import type { Transaction } from '@/types';
import type { RecurringTemplate } from '@/features/recurring/recurringUtils';
import { budgetPace } from './budgetPace';

type Row = Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id' | 'recurring_transaction_id'>;

const expense = (date: string, amount: number, overrides: Partial<Row> = {}): Row => ({
  type: 'expense',
  category_id: 1,
  amount,
  date,
  account_id: 1,
  recurring_transaction_id: null,
  ...overrides,
});

const bill = (overrides: Partial<RecurringTemplate>): RecurringTemplate => ({
  amount: 100,
  kind: 'transaction',
  type: 'expense',
  category_id: 1,
  account_id: 1,
  to_account_id: null,
  frequency: 'monthly',
  end_date: null,
  next_due_date: '2026-10-25',
  is_active: 1,
  ...overrides,
  start_date: overrides.start_date ?? overrides.next_due_date ?? '2026-10-25',
});

const currencyFilter = { currency: 'EUR', accountCurrencyById: { 1: 'EUR', 2: 'USD' } };
// Oct 15: 15 of October's 31 days have passed
const midOctober = new Date(2026, 9, 15);
const monthly = { category_id: 1, amount: 400, period: 'monthly' as const };

describe('budgetPace', () => {
  it('projects the daily pace to the end of the period and dates the crossing', () => {
    // Given €300 spent by hand over 15 days — €20/day — against €400
    const rows = [expense('2026-10-01', 150), expense('2026-10-14', 150)];
    // When projecting from Oct 15
    const pace = budgetPace(monthly, rows, [], currencyFilter, midOctober);
    // Then it ends at €300 + 16 × €20 = €620 and crosses €400 on Oct 20 (300 + 5 × 20)
    expect(pace?.projected).toBeCloseTo(620);
    expect(pace?.overOn).toBe('2026-10-20');
  });

  it('returns null when the projection stays under the limit', () => {
    // Given €75 spent in 15 days — €5/day — against €400
    expect(budgetPace(monthly, [expense('2026-10-02', 75)], [], currencyFilter, midOctober)).toBeNull();
  });

  it('returns null when the budget is already over', () => {
    expect(budgetPace(monthly, [expense('2026-10-02', 450)], [], currencyFilter, midOctober)).toBeNull();
  });

  it('returns null before a fifth of the period has passed', () => {
    // Given a big spend on Oct 3 — 3 of 31 days in
    const early = new Date(2026, 9, 3);
    expect(budgetPace(monthly, [expense('2026-10-01', 300)], [], currencyFilter, early)).toBeNull();
  });

  it('adds a recurring bill on its date without counting generated rows in the pace', () => {
    // Given a recurring-generated €100 row and €150 by hand (€10/day), with the next €200 bill on Oct 25
    const rows = [
      expense('2026-10-01', 100, { recurring_transaction_id: 7 }),
      expense('2026-10-10', 150),
    ];
    const pace = budgetPace(monthly, rows, [bill({ amount: 200 })], currencyFilter, midOctober);
    // Then by Oct 24 it is €250 + 9 × €10 = €340; the bill on the 25th takes it to €550
    expect(pace?.overOn).toBe('2026-10-25');
    expect(pace?.projected).toBeCloseTo(250 + 16 * 10 + 200);
  });

  it('only counts spending in the budget currency', () => {
    // Given €350 spent on a USD account and a USD recurring bill
    const rows = [expense('2026-10-05', 350, { account_id: 2 })];
    const usdBill = bill({ account_id: 2, amount: 500 });
    // Then the EUR budget sees nothing
    expect(budgetPace(monthly, rows, [usdBill], currencyFilter, midOctober)).toBeNull();
  });

  it('places a future-dated expense on its own day', () => {
    // Given €150 by hand to date (€10/day) and a €200 expense already entered for Oct 28
    const rows = [expense('2026-10-05', 150), expense('2026-10-28', 200)];
    const pace = budgetPace(monthly, rows, [], currencyFilter, midOctober);
    // Then it crosses on Oct 28: 150 + 13 × 10 + 200
    expect(pace?.overOn).toBe('2026-10-28');
  });
});
