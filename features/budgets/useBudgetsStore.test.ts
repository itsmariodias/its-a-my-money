import { useBudgetsStore } from './useBudgetsStore';
import type { BudgetWithDetails } from '@/types';

const makeItem = (id: number, overrides: Partial<BudgetWithDetails> = {}): BudgetWithDetails => ({
  id,
  category_id: 1,
  amount: 500,
  period: 'monthly',
  currency: 'USD',
  created_at: '2026-01-01T00:00:00.000Z',
  category_name: 'Food',
  category_color: '#4CAF50',
  category_icon: 'local-grocery-store',
  ...overrides,
});

const initialState = { budgets: [] };

describe('useBudgetsStore', () => {
  beforeEach(() => {
    useBudgetsStore.setState(initialState);
  });

  it('sets budgets', () => {
    // Given initial empty state
    const items = [makeItem(1), makeItem(2)];
    // When setting budgets
    useBudgetsStore.getState().setBudgets(items);
    // Then store has all items
    expect(useBudgetsStore.getState().budgets).toEqual(items);
  });

  it('adds a budget to the front', () => {
    // Given an existing item
    useBudgetsStore.setState({ budgets: [makeItem(1)] });
    // When adding a new item
    useBudgetsStore.getState().addBudget(makeItem(2));
    // Then the new item is first
    const items = useBudgetsStore.getState().budgets;
    expect(items[0].id).toBe(2);
    expect(items).toHaveLength(2);
  });

  it('updates an existing budget', () => {
    // Given an existing item with amount 50
    useBudgetsStore.setState({ budgets: [makeItem(1, { amount: 50 })] });
    // When updating with amount 200
    useBudgetsStore.getState().updateBudget(makeItem(1, { amount: 200 }));
    // Then the item is replaced
    expect(useBudgetsStore.getState().budgets[0].amount).toBe(200);
  });

  it('removes a budget by id', () => {
    // Given two items
    useBudgetsStore.setState({ budgets: [makeItem(1), makeItem(2)] });
    // When removing id 1
    useBudgetsStore.getState().removeBudget(1);
    // Then only id 2 remains
    const items = useBudgetsStore.getState().budgets;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(2);
  });

  it('does nothing when removing a non-existent id', () => {
    // Given one item
    useBudgetsStore.setState({ budgets: [makeItem(1)] });
    // When removing a non-existent id
    useBudgetsStore.getState().removeBudget(99);
    // Then nothing changes
    expect(useBudgetsStore.getState().budgets).toHaveLength(1);
  });
});
