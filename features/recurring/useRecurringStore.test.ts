import { useRecurringStore } from './useRecurringStore';
import type { RecurringTransactionWithDetails } from '@/types';

const makeItem = (id: number, overrides: Partial<RecurringTransactionWithDetails> = {}): RecurringTransactionWithDetails => ({
  id,
  amount: 100,
  type: 'expense',
  category_id: 1,
  account_id: 1,
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
  ...overrides,
});

const initialState = { recurringTransactions: [] };

describe('useRecurringStore', () => {
  beforeEach(() => {
    useRecurringStore.setState(initialState);
  });

  it('sets recurring transactions', () => {
    // Given initial empty state
    const items = [makeItem(1), makeItem(2)];

    // When setting transactions
    useRecurringStore.getState().setRecurringTransactions(items);

    // Then store has all items
    expect(useRecurringStore.getState().recurringTransactions).toEqual(items);
  });

  it('adds a recurring transaction to the front', () => {
    // Given existing items
    useRecurringStore.setState({ recurringTransactions: [makeItem(1)] });
    const newItem = makeItem(2);

    // When adding
    useRecurringStore.getState().addRecurring(newItem);

    // Then new item is first
    const items = useRecurringStore.getState().recurringTransactions;
    expect(items[0].id).toBe(2);
    expect(items).toHaveLength(2);
  });

  it('updates an existing recurring transaction', () => {
    // Given existing item
    useRecurringStore.setState({ recurringTransactions: [makeItem(1, { amount: 50 })] });
    const updated = makeItem(1, { amount: 200 });

    // When updating
    useRecurringStore.getState().updateRecurring(updated);

    // Then item is replaced
    const items = useRecurringStore.getState().recurringTransactions;
    expect(items[0].amount).toBe(200);
    expect(items).toHaveLength(1);
  });

  it('removes a recurring transaction by id', () => {
    // Given two items
    useRecurringStore.setState({ recurringTransactions: [makeItem(1), makeItem(2)] });

    // When removing id 1
    useRecurringStore.getState().removeRecurring(1);

    // Then only id 2 remains
    const items = useRecurringStore.getState().recurringTransactions;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(2);
  });

  it('does nothing when removing a non-existent id', () => {
    // Given one item
    useRecurringStore.setState({ recurringTransactions: [makeItem(1)] });

    // When removing a non-existent id
    useRecurringStore.getState().removeRecurring(99);

    // Then nothing changes
    expect(useRecurringStore.getState().recurringTransactions).toHaveLength(1);
  });
});
