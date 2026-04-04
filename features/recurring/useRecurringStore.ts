import { create } from 'zustand';
import type { RecurringTransactionWithDetails } from '@/types';

interface RecurringState {
  recurringTransactions: RecurringTransactionWithDetails[];
  setRecurringTransactions: (items: RecurringTransactionWithDetails[]) => void;
  addRecurring: (item: RecurringTransactionWithDetails) => void;
  updateRecurring: (item: RecurringTransactionWithDetails) => void;
  removeRecurring: (id: number) => void;
}

export const useRecurringStore = create<RecurringState>((set) => ({
  recurringTransactions: [],
  setRecurringTransactions: (items) => set({ recurringTransactions: items }),
  addRecurring: (item) => set((s) => ({ recurringTransactions: [item, ...s.recurringTransactions] })),
  updateRecurring: (item) =>
    set((s) => ({
      recurringTransactions: s.recurringTransactions.map((r) => (r.id === item.id ? item : r)),
    })),
  removeRecurring: (id) =>
    set((s) => ({ recurringTransactions: s.recurringTransactions.filter((r) => r.id !== id) })),
}));
