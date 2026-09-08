import type { Category } from '@/types';
import { categoriesOfType, useCategoriesStore } from './useCategoriesStore';

const makeCat = (id: number, name: string, type: 'income' | 'expense' = 'expense'): Category => ({
  id, name, type, color: '#f00', icon: 'label', is_default: 0,
});

describe('useCategoriesStore', () => {
  beforeEach(() => {
    useCategoriesStore.setState({ categories: [] });
  });

  it('keeps categories grouped by type and alphabetical within a type', () => {
    // Given categories loaded from the DB in arbitrary order
    // When they are set
    useCategoriesStore.getState().setCategories([
      makeCat(1, 'Rent'),
      makeCat(2, 'Salary', 'income'),
      makeCat(3, 'Food'),
      makeCat(4, 'Bonus', 'income'),
    ]);

    // Then they come back in the same order the DB would return
    expect(useCategoriesStore.getState().categories.map((c) => c.name)).toEqual([
      'Food', 'Rent', 'Bonus', 'Salary',
    ]);
  });

  it('inserts a newly created category in its sorted position', () => {
    // Given two expense categories
    useCategoriesStore.getState().setCategories([makeCat(1, 'Food'), makeCat(2, 'Rent')]);

    // When a new one is added from a sheet
    useCategoriesStore.getState().upsertCategory(makeCat(3, 'Groceries'));

    // Then it lands alphabetically, not at the end
    expect(useCategoriesStore.getState().categories.map((c) => c.name)).toEqual([
      'Food', 'Groceries', 'Rent',
    ]);
  });

  it('replaces a category in place when it is edited', () => {
    // Given an existing category
    useCategoriesStore.getState().setCategories([makeCat(1, 'Food'), makeCat(2, 'Rent')]);

    // When it is renamed
    useCategoriesStore.getState().upsertCategory({ ...makeCat(1, 'Dining'), color: '#0f0' });

    // Then it is updated rather than duplicated, and re-sorted
    const { categories } = useCategoriesStore.getState();
    expect(categories).toHaveLength(2);
    expect(categories.map((c) => c.name)).toEqual(['Dining', 'Rent']);
    expect(categories[0].color).toBe('#0f0');
  });

  it('drops a deleted category', () => {
    // Given two categories
    useCategoriesStore.getState().setCategories([makeCat(1, 'Food'), makeCat(2, 'Rent')]);

    // When one is deleted
    useCategoriesStore.getState().removeCategory(1);

    // Then only the other remains
    expect(useCategoriesStore.getState().categories.map((c) => c.name)).toEqual(['Rent']);
  });
});

describe('categoriesOfType', () => {
  it('returns only the categories of the requested type, in order', () => {
    // Given a mixed list
    const categories = [
      makeCat(1, 'Food'),
      makeCat(2, 'Rent'),
      makeCat(3, 'Salary', 'income'),
    ];

    // When filtering by type
    // Then each type sees only its own
    expect(categoriesOfType(categories, 'expense').map((c) => c.name)).toEqual(['Food', 'Rent']);
    expect(categoriesOfType(categories, 'income').map((c) => c.name)).toEqual(['Salary']);
  });
});
