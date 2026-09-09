import { create } from 'zustand';
import type { Category } from '@/types';

/** Same order as the DB: grouped by type, alphabetical within a type. */
function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
  );
}

/** The categories of one type, in display order. Memoise the result in components. */
export function categoriesOfType(categories: Category[], type: 'income' | 'expense'): Category[] {
  return categories.filter((c) => c.type === type);
}

interface CategoriesState {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  upsertCategory: (category: Category) => void;
  removeCategory: (id: number) => void;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: [],

  setCategories: (categories) => set({ categories: sortCategories(categories) }),

  upsertCategory: (category) =>
    set((state) => {
      const exists = state.categories.some((c) => c.id === category.id);
      return {
        categories: sortCategories(
          exists
            ? state.categories.map((c) => (c.id === category.id ? category : c))
            : [...state.categories, category]
        ),
      };
    }),

  removeCategory: (id) =>
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
}));
