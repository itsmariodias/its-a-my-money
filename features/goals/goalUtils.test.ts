import type { Transaction } from '@/types';
import { goalProgress, goalStatusColor, targetDateLabel } from './goalUtils';

const ACCENT = '#2f95dc';

const goal = { category_id: 1, target_amount: 10000, start_date: '2026-01-01' };

type Tx = Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>;
const tx = (overrides: Partial<Tx> = {}): Tx => ({
  type: 'expense', category_id: 1, amount: 1000, date: '2026-02-01', account_id: 1, ...overrides,
});

describe('goalProgress', () => {
  it('adds up expenses in the category since the start date', () => {
    // Given two fee payments after the goal was created
    const transactions = [tx({ amount: 4000 }), tx({ amount: 2000, date: '2026-03-01' })];

    // When measuring progress
    const progress = goalProgress(goal, transactions);

    // Then both count toward the target
    expect(progress).toEqual({ saved: 6000, pct: 60 });
  });

  it('ignores spend from before the goal existed', () => {
    // Given a payment made the day before the goal started
    const transactions = [tx({ amount: 5000, date: '2025-12-31' }), tx({ amount: 1000 })];

    // When measuring progress
    const progress = goalProgress(goal, transactions);

    // Then a new goal is not retroactively filled by history
    expect(progress.saved).toBe(1000);
  });

  it('counts a future-dated payment', () => {
    // Given a fee scheduled for next year — money already committed
    const transactions = [tx({ amount: 3000, date: '2027-06-01' })];

    // When measuring progress
    // Then it counts: a goal has no period end
    expect(goalProgress(goal, transactions).saved).toBe(3000);
  });

  it('ignores income and other categories', () => {
    // Given a refund and spend on an unrelated category
    const transactions = [
      tx({ amount: 5000, type: 'income' }),
      tx({ amount: 5000, category_id: 2 }),
      tx({ amount: 1000 }),
    ];

    // When measuring progress
    // Then only expenses in the goal's own category count
    expect(goalProgress(goal, transactions).saved).toBe(1000);
  });

  it('only counts accounts in the goal currency', () => {
    // Given the same category paid from a rupee account and an Australian one
    const transactions = [tx({ amount: 4000, account_id: 1 }), tx({ amount: 9000, account_id: 2 })];

    // When measuring an INR goal
    const progress = goalProgress(goal, transactions, {
      currency: 'INR',
      accountCurrencyById: { 1: 'INR', 2: 'AUD' },
    });

    // Then the AUD spend is excluded — the app never converts
    expect(progress.saved).toBe(4000);
  });

  it('reports zero percent for a goal with no target', () => {
    // Given a zero target, which would divide by zero
    const transactions = [tx({ amount: 1000 })];

    // When measuring progress
    const progress = goalProgress({ ...goal, target_amount: 0 }, transactions);

    // Then the spend is still reported but the percentage is safe
    expect(progress).toEqual({ saved: 1000, pct: 0 });
  });

  it('reports over 100 percent once the target is passed', () => {
    // Given more spend than the target
    const transactions = [tx({ amount: 12500 })];

    // When measuring progress
    // Then the percentage is not clamped — callers clamp the bar, not the number
    expect(goalProgress(goal, transactions).pct).toBe(125);
  });
});

describe('goalStatusColor', () => {
  it('turns green once the goal is reached', () => {
    // Given a completed goal, even one past its deadline
    // When picking a colour
    // Then completion wins: reaching the target is the success case
    expect(goalStatusColor(100, null, ACCENT, '2026-06-01')).toBe('#4CAF50');
    expect(goalStatusColor(140, '2026-01-01', ACCENT, '2026-06-01')).toBe('#4CAF50');
  });

  it('turns red when the deadline passed with the goal unmet', () => {
    // Given an incomplete goal whose target date is behind us
    // When picking a colour
    // Then it reads as overdue
    expect(goalStatusColor(60, '2026-05-31', ACCENT, '2026-06-01')).toBe('#F44336');
  });

  it('uses the accent colour while a goal is still in progress', () => {
    // Given an unfinished goal with no deadline, or one still ahead
    // When picking a colour
    // Then it is neutral — being under target is not a failure
    expect(goalStatusColor(60, null, ACCENT, '2026-06-01')).toBe(ACCENT);
    expect(goalStatusColor(99, '2026-12-31', ACCENT, '2026-06-01')).toBe(ACCENT);
  });
});

describe('targetDateLabel', () => {
  it('has nothing to say without a target date', () => {
    // Given a goal with no deadline
    // When labelling it
    // Then there is no countdown to show
    expect(targetDateLabel(null, '2026-06-01')).toBeNull();
  });

  it('counts down in days inside a month', () => {
    // Given deadlines a few days out
    // When labelling them
    // Then the wording is singular or plural as appropriate
    expect(targetDateLabel('2026-06-01', '2026-06-01')).toBe('Due today');
    expect(targetDateLabel('2026-06-02', '2026-06-01')).toBe('1 day left');
    expect(targetDateLabel('2026-06-13', '2026-06-01')).toBe('12 days left');
  });

  it('counts down in months further out', () => {
    // Given deadlines months away
    // When labelling them
    // Then days give way to months
    expect(targetDateLabel('2026-07-01', '2026-06-01')).toBe('1 month left');
    expect(targetDateLabel('2026-10-01', '2026-06-01')).toBe('4 months left');
  });

  it('says overdue once the date has passed', () => {
    // Given yesterday's deadline
    // When labelling it
    // Then it reads as overdue rather than a negative countdown
    expect(targetDateLabel('2026-05-31', '2026-06-01')).toBe('Overdue');
  });
});
