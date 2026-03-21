import { useTransactionsStore } from './useTransactionsStore';
import type { TransactionWithDetails } from '@/types';

const makeTx = (overrides: Partial<TransactionWithDetails> = {}): TransactionWithDetails => ({
  id: 1, amount: 50, type: 'expense', category_id: 1, account_id: 1,
  note: null, date: '2026-01-01', created_at: '2026-01-01T00:00:00Z',
  category_name: 'Food', category_color: '#f00', category_icon: 'restaurant', account_name: 'Cash',
  ...overrides,
});

describe('useTransactionsStore', () => {
  beforeEach(() => {
    useTransactionsStore.setState({ transactions: [] });
  });

  it('should prepend new transactions', () => {
    // Given the store has one transaction (id:1)
    useTransactionsStore.setState({ transactions: [makeTx({ id: 1 })] });
    // When addTransaction is called with id:2
    useTransactionsStore.getState().addTransaction(makeTx({ id: 2 }));
    // Then the new transaction should be first
    const ids = useTransactionsStore.getState().transactions.map((t) => t.id);
    expect(ids).toEqual([2, 1]);
  });

  it('should update a transaction in place', () => {
    // Given the store has tx id:2 amount:100
    useTransactionsStore.setState({ transactions: [makeTx({ id: 1 }), makeTx({ id: 2, amount: 100 })] });
    // When updateTransaction is called with id:2 amount:200
    useTransactionsStore.getState().updateTransaction(makeTx({ id: 2, amount: 200 }));
    // Then amount should be 200 and length should be 2
    const { transactions } = useTransactionsStore.getState();
    expect(transactions).toHaveLength(2);
    expect(transactions.find((t) => t.id === 2)?.amount).toBe(200);
  });
});
