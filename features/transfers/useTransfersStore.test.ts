import { useTransfersStore } from './useTransfersStore';
import type { TransferWithDetails } from '@/types';

const makeTransfer = (overrides: Partial<TransferWithDetails> = {}): TransferWithDetails => ({
  id: 1, from_account_id: 1, to_account_id: 2, amount: 100,
  note: null, date: '2026-01-01', created_at: '2026-01-01T00:00:00Z',
  from_account_name: 'Cash', from_account_color: null, from_account_icon: null,
  to_account_name: 'Bank', to_account_color: null, to_account_icon: null,
  ...overrides,
});

describe('useTransfersStore', () => {
  beforeEach(() => {
    useTransfersStore.setState({ transfers: [] });
  });

  it('should add and remove transfers', () => {
    // Given an empty transfers store
    // When addTransfer is called
    useTransfersStore.getState().addTransfer(makeTransfer({ id: 1 }));
    expect(useTransfersStore.getState().transfers).toHaveLength(1);
    // And when removeTransfer is called
    useTransfersStore.getState().removeTransfer(1);
    // Then the store should be empty
    expect(useTransfersStore.getState().transfers).toHaveLength(0);
  });
});
