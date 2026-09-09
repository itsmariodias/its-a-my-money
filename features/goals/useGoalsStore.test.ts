import type { GoalWithDetails } from '@/types';
import { useGoalsStore } from './useGoalsStore';

const makeItem = (id: number, overrides: Partial<GoalWithDetails> = {}): GoalWithDetails => ({
  id,
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

const initialState = { goals: [] };

describe('useGoalsStore', () => {
  beforeEach(() => {
    useGoalsStore.setState(initialState);
  });

  it('sets the full list of goals', () => {
    // Given goals loaded from the DB
    // When they are set
    useGoalsStore.getState().setGoals([makeItem(1), makeItem(2)]);

    // Then the store holds them
    expect(useGoalsStore.getState().goals.map((g) => g.id)).toEqual([1, 2]);
  });

  it('adds a new goal to the front of the list', () => {
    // Given an existing goal
    useGoalsStore.getState().setGoals([makeItem(1)]);

    // When another is created
    useGoalsStore.getState().addGoal(makeItem(2));

    // Then the newest one leads
    expect(useGoalsStore.getState().goals.map((g) => g.id)).toEqual([2, 1]);
  });

  it('updates an existing goal in place', () => {
    // Given two goals
    useGoalsStore.getState().setGoals([makeItem(1), makeItem(2)]);

    // When one has its target raised
    useGoalsStore.getState().updateGoal(makeItem(1, { target_amount: 25000 }));

    // Then it is replaced, not duplicated, and keeps its position
    const { goals } = useGoalsStore.getState();
    expect(goals).toHaveLength(2);
    expect(goals[0].target_amount).toBe(25000);
    expect(goals.map((g) => g.id)).toEqual([1, 2]);
  });

  it('removes a goal by id', () => {
    // Given two goals
    useGoalsStore.getState().setGoals([makeItem(1), makeItem(2)]);

    // When one is deleted
    useGoalsStore.getState().removeGoal(1);

    // Then only the other remains
    expect(useGoalsStore.getState().goals.map((g) => g.id)).toEqual([2]);
  });
});
