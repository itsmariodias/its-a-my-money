import { create } from 'zustand';
import type { BudgetWithDetails } from '@/types';

interface BudgetsState {
  budgets: BudgetWithDetails[];
  setBudgets: (items: BudgetWithDetails[]) => void;
  addBudget: (item: BudgetWithDetails) => void;
  updateBudget: (item: BudgetWithDetails) => void;
  removeBudget: (id: number) => void;
}

export const useBudgetsStore = create<BudgetsState>((set) => ({
  budgets: [],
  setBudgets: (items) => set({ budgets: items }),
  addBudget: (item) => set((s) => ({ budgets: [item, ...s.budgets] })),
  updateBudget: (item) =>
    set((s) => ({ budgets: s.budgets.map((b) => (b.id === item.id ? item : b)) })),
  removeBudget: (id) =>
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
}));
