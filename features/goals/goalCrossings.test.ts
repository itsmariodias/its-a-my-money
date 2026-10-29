import type { GoalWithDetails } from '@/types';
import { findReachedGoals } from './goalCrossings';

const goal = (overrides: Partial<GoalWithDetails> = {}): GoalWithDetails => ({
  id: 1,
  name: 'Japan trip',
  icon: 'flight',
  color: '#2196F3',
  account_id: 1,
  target_amount: 1000,
  target_date: null,
  created_at: '2026-01-01',
  account_name: 'Savings',
  account_currency: 'USD',
  saved: 0,
  ...overrides,
});

describe('findReachedGoals', () => {
  it('flags a goal a save pushed to its target', () => {
    // Given a goal at 900 that a save took to 1,000
    const prev = [goal({ saved: 900 })];
    const curr = [goal({ saved: 1000 })];

    // When looking for reached goals
    // Then it is flagged
    expect(findReachedGoals(prev, curr).map((g) => g.id)).toEqual([1]);
  });

  it('stays quiet once a goal is already reached', () => {
    // Given a goal already over its target that receives more
    const prev = [goal({ saved: 1000 })];
    const curr = [goal({ saved: 1200 })];

    // When looking for reached goals
    // Then nothing fires again — the edge is strict
    expect(findReachedGoals(prev, curr)).toEqual([]);
  });

  it('ignores goals still under target', () => {
    // Given a goal that grew but is not yet full
    // When looking for reached goals
    // Then nothing fires
    expect(findReachedGoals([goal({ saved: 100 })], [goal({ saved: 500 })])).toEqual([]);
  });

  it('flags a goal created and filled in one step', () => {
    // Given a goal missing from the before-snapshot
    // When it arrives already full
    // Then it counts as reached from empty
    expect(findReachedGoals([], [goal({ saved: 1000 })]).map((g) => g.id)).toEqual([1]);
  });

  it('never fires for a goal with no target', () => {
    // Given a zero-target goal
    // When money arrives
    // Then it is skipped
    expect(findReachedGoals([goal({ target_amount: 0 })], [goal({ target_amount: 0, saved: 10 })])).toEqual([]);
  });
});
