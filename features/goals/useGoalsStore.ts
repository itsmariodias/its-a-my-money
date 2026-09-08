import { create } from 'zustand';
import type { GoalWithDetails } from '@/types';

interface GoalsState {
  goals: GoalWithDetails[];
  setGoals: (items: GoalWithDetails[]) => void;
  addGoal: (item: GoalWithDetails) => void;
  updateGoal: (item: GoalWithDetails) => void;
  removeGoal: (id: number) => void;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  setGoals: (items) => set({ goals: items }),
  addGoal: (item) => set((s) => ({ goals: [item, ...s.goals] })),
  updateGoal: (item) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === item.id ? item : g)) })),
  removeGoal: (id) =>
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
}));
