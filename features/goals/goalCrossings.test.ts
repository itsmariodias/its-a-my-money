import type { GoalWithDetails, Transaction } from '@/types';
import { findReachedGoals } from './goalCrossings';

const makeGoal = (overrides: Partial<GoalWithDetails> = {}): GoalWithDetails => ({
  id: 1,
  category_id: 1,
  target_amount: 10000,
  currency: 'USD',
  start_date: '2026-01-01',
  target_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
  category_name: 'Education',
  category_color: '#3b82f6',
  category_icon: 'school',
  ...overrides,
});

type Tx = Pick<Transaction, 'type' | 'category_id' | 'amount' | 'date' | 'account_id'>;
const tx = (amount: number, overrides: Partial<Tx> = {}): Tx => ({
  type: 'expense', category_id: 1, amount, date: '2026-02-01', account_id: 1, ...overrides,
});

describe('findReachedGoals', () => {
  it('reports a goal the save just pushed to its target', () => {
    // Given a goal at 6,000 of 10,000
    const goal = makeGoal();
    const before = [tx(6000)];

    // When a 4,000 payment lands
    const after = [tx(6000), tx(4000)];

    // Then the goal is reported as reached
    expect(findReachedGoals([goal], before, after)).toEqual([goal]);
  });

  it('stays quiet while the goal is still short', () => {
    // Given a payment that leaves the goal under target
    const before = [tx(1000)];
    const after = [tx(1000), tx(2000)];

    // When checking
    // Then nothing fires
    expect(findReachedGoals([makeGoal()], before, after)).toEqual([]);
  });

  it('does not fire again on a goal that was already reached', () => {
    // Given a goal already over its target
    const before = [tx(10000)];

    // When another payment is added
    const after = [tx(10000), tx(500)];

    // Then it stays quiet — the edge is strict, so it fires once
    expect(findReachedGoals([makeGoal()], before, after)).toEqual([]);
  });

  it('fires when a payment overshoots the target', () => {
    // Given a goal at zero
    const goal = makeGoal();

    // When one payment covers more than the whole target
    const reached = findReachedGoals([goal], [], [tx(12000)]);

    // Then it counts as reached
    expect(reached).toEqual([goal]);
  });

  it('skips goals with no target amount', () => {
    // Given a goal whose target is zero, which can never be "reached"
    const goal = makeGoal({ target_amount: 0 });

    // When a payment lands
    // Then it is skipped rather than firing on every save
    expect(findReachedGoals([goal], [], [tx(500)])).toEqual([]);
  });

  it('only counts spend in the goal currency', () => {
    // Given an INR goal and a payment from an AUD account
    const goal = makeGoal({ currency: 'INR' });
    const accountCurrencyById = { 1: 'INR', 2: 'AUD' };
    const before = [tx(9000)];
    const after = [tx(9000), tx(5000, { account_id: 2 })];

    // When checking with the currency map
    // Then the AUD payment does not complete the INR goal
    expect(findReachedGoals([goal], before, after, accountCurrencyById)).toEqual([]);

    // And a payment on the matching account does
    const afterInr = [tx(9000), tx(5000)];
    expect(findReachedGoals([goal], before, afterInr, accountCurrencyById)).toEqual([goal]);
  });

  it('reports every goal reached by one save', () => {
    // Given two goals on the same category, one small and one just met
    const small = makeGoal({ id: 1, target_amount: 1000 });
    const large = makeGoal({ id: 2, target_amount: 3000 });

    // When a payment clears both
    const reached = findReachedGoals([small, large], [], [tx(3000)]);

    // Then both are reported
    expect(reached.map((g) => g.id)).toEqual([1, 2]);
  });
});
