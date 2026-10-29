import type { Account } from '@/types';
import {
  availableAsOf,
  goalProgress,
  goalStatusColor,
  hasSplitErrors,
  moveError,
  overReservedAfterSave,
  reservedAcross,
  reservedByAccount,
  savedExcluding,
  targetDateLabel,
  validateSplits,
} from './goalUtils';

const ACCENT = '#2f95dc';

describe('goalProgress', () => {
  it('reads progress from what the bucket holds', () => {
    // Given a goal holding 6,000 of a 10,000 target
    // When measuring progress
    const progress = goalProgress({ saved: 6000, target_amount: 10000 });

    // Then it is 60% full
    expect(progress).toEqual({ saved: 6000, pct: 60 });
  });

  it('can run past 100%', () => {
    // Given a goal that was over-filled
    // When measuring progress
    // Then the percentage is not capped — the bar caps, the number does not
    expect(goalProgress({ saved: 1500, target_amount: 1000 }).pct).toBe(150);
  });

  it('treats a zero target as no progress rather than dividing by zero', () => {
    // Given a goal with a zero target
    // When measuring progress
    // Then pct is 0
    expect(goalProgress({ saved: 100, target_amount: 0 }).pct).toBe(0);
  });
});

describe('reservedByAccount', () => {
  it('sums what every goal in an account holds', () => {
    // Given two goals in account 1 and one in account 2
    const goals = [
      { account_id: 1, saved: 300 },
      { account_id: 1, saved: 200 },
      { account_id: 2, saved: 50 },
    ];

    // When totalling per account
    // Then each account's reserved amount is the sum of its goals
    expect(reservedByAccount(goals)).toEqual({ 1: 500, 2: 50 });
  });
});

describe('reservedAcross', () => {
  it('sums what goals hold across the given accounts', () => {
    // Given goals holding money in accounts 1 and 2, but not 3
    const reserved = { 1: 500, 2: 50 };

    // When totalling accounts 1, 2 and 3
    // Then only the accounts with goals contribute
    expect(reservedAcross(reserved, [1, 2, 3])).toBe(550);
  });

  it('is undefined when none of the accounts has a goal', () => {
    // Given goals only in account 1
    // When totalling accounts 2 and 3
    // Then there is nothing to show, rather than "Reserved 0"
    expect(reservedAcross({ 1: 500 }, [2, 3])).toBeUndefined();
  });
});

describe('availableAsOf', () => {
  const account: Account = {
    id: 1, name: 'Savings', initial_balance: 1000, currency: 'EUR', color: null, icon: null,
    account_type: 'cash', current_value: null, created_at: '2026-01-01',
  };
  const goals = [{ account_id: 1, saved: 300 }, { account_id: 2, saved: 999 }];

  it('is the balance minus what this account\'s goals hold', () => {
    // Given 1,000 in the account and 300 in its goals
    // When measuring Available
    // Then only this account's goals count
    expect(availableAsOf(account, [], [], goals, '2026-10-29')).toBe(700);
  });

  it('ignores money dated after the day it is measured on', () => {
    // Given a 500 income dated next month
    const transactions = [{ account_id: 1, type: 'income' as const, amount: 500, date: '2026-11-15' }];

    // When measuring Available today
    // Then that income cannot be reserved yet
    expect(availableAsOf(account, transactions, [], goals, '2026-10-29')).toBe(700);
    expect(availableAsOf(account, transactions, [], goals, '2026-11-15')).toBe(1200);
  });

  it('counts transfers out of the account', () => {
    // Given 800 transferred out today
    const transfers = [{ from_account_id: 1, to_account_id: 2, amount: 800, to_amount: null, date: '2026-10-29' }];

    // When measuring Available
    // Then it drops below zero — the goals' 300 is no longer all there
    expect(availableAsOf(account, [], transfers, goals, '2026-10-29')).toBe(-100);
  });

  it('subtracts money a pending save would set aside', () => {
    // Given a save that reserves 200 more
    // Then Available falls by 200
    expect(availableAsOf(account, [], [], goals, '2026-10-29', 200)).toBe(500);
  });
});

describe('overReservedAfterSave', () => {
  it('warns when a save takes Available below zero', () => {
    // Given Available goes from 100 to -50
    // Then the projected figure is returned for the warning
    expect(overReservedAfterSave(100, -50)).toBe(-50);
  });

  it('stays quiet when Available stays at or above zero', () => {
    expect(overReservedAfterSave(100, 0)).toBeNull();
  });

  it('stays quiet when a save does not lower an already-negative Available', () => {
    // Given an account already at -50, and an edit that changes only the note
    // Then there is nothing new to warn about
    expect(overReservedAfterSave(-50, -50)).toBeNull();
    // But a save that makes it worse still warns
    expect(overReservedAfterSave(-50, -80)).toBe(-80);
  });
});

describe('savedExcluding', () => {
  it('takes a transaction\'s own splits back out of each goal', () => {
    // Given goal 1 holds 500, 200 of which came from the income being edited
    const goals = [{ id: 1, saved: 500 }, { id: 2, saved: 80 }];
    const allocations = [{ goal_id: 1, amount: 200 }];

    // When computing what each goal holds without that transaction
    // Then only goal 1 is reduced
    expect(savedExcluding(goals, allocations)).toEqual({ 1: 300, 2: 80 });
  });

  it('adds back what an edited expense took out', () => {
    // Given goal 1 holds 100 after an expense took 50 from it
    // When excluding that expense
    // Then the goal is back to 150 — the edit can spend up to that
    expect(savedExcluding([{ id: 1, saved: 100 }], [{ goal_id: 1, amount: -50 }])).toEqual({ 1: 150 });
  });
});

describe('validateSplits', () => {
  it('accepts an income split that fits the income', () => {
    // Given 1,000 income split 300 / 200
    const errors = validateSplits('reserve', [{ goal_id: 1, amount: 300 }, { goal_id: 2, amount: 200 }], 1000, {});

    // Then nothing is flagged
    expect(hasSplitErrors(errors)).toBe(false);
  });

  it('rejects putting more into goals than the income brings in', () => {
    // Given 100 income with 120 sent to goals
    const errors = validateSplits('reserve', [{ goal_id: 1, amount: 70 }, { goal_id: 2, amount: 50 }], 100, {});

    // Then the total is flagged
    expect(errors.total).toBe('Goals get more than this income');
    expect(errors.byGoal).toEqual({});
  });

  it('does not cap an income split by what the goal already holds', () => {
    // Given an empty goal receiving 500
    // Then that is fine — reserving fills an empty bucket
    expect(hasSplitErrors(validateSplits('reserve', [{ goal_id: 1, amount: 500 }], 500, { 1: 0 }))).toBe(false);
  });

  it('rejects paying more from a goal than it holds', () => {
    // Given a goal holding 40 asked to pay 50
    const errors = validateSplits('spend', [{ goal_id: 1, amount: 50 }], 80, { 1: 40 });

    // Then that goal is flagged, but the total is within the expense
    expect(errors.byGoal).toEqual({ 1: 'More than this goal holds' });
    expect(errors.total).toBeNull();
  });

  it('rejects goals paying more than the expense', () => {
    // Given a 50 expense with 60 taken from goals
    const errors = validateSplits('spend', [{ goal_id: 1, amount: 60 }], 50, { 1: 100 });

    // Then the total is flagged
    expect(errors.total).toBe('Goals pay more than this expense');
  });

  it('ignores sub-cent rounding drift', () => {
    // Given three thirds of 100 typed by hand
    const splits = [33.33, 33.33, 33.34].map((amount, i) => ({ goal_id: i, amount }));

    // Then the float sum does not trip the limit
    expect(hasSplitErrors(validateSplits('reserve', splits, 100, {}))).toBe(false);
  });
});

describe('moveError', () => {
  it('caps a manual add at what the account has available', () => {
    // Given 200 available in the account
    // When adding 250 to a goal
    // Then it is refused — money already in another goal cannot be reserved twice
    expect(moveError('add', 250, 0, 200)).toBe('More than the account has available');
    expect(moveError('add', 200, 0, 200)).toBeNull();
  });

  it('caps a release at what the goal holds', () => {
    // Given a goal holding 100
    // When releasing 150
    // Then it is refused; releasing 100 is fine
    expect(moveError('release', 150, 100, 0)).toBe('More than this goal holds');
    expect(moveError('release', 100, 100, 0)).toBeNull();
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
