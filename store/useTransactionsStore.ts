import { create } from 'zustand';
import type { TransactionWithDetails } from '@/types';

interface TransactionsState {
  transactions: TransactionWithDetails[];
  setTransactions: (transactions: TransactionWithDetails[]) => void;
  addTransaction: (transaction: TransactionWithDetails) => void;
  updateTransaction: (transaction: TransactionWithDetails) => void;
  removeTransaction: (id: number) => void;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],

  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),

  updateTransaction: (transaction) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transaction.id ? transaction : t
      ),
    })),

  removeTransaction: (id) =>
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),
}));
