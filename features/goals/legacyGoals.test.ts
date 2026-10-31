import { convertLegacyGoal, isLegacyGoal, type LegacyGoal } from './legacyGoals';

const legacy: LegacyGoal = {
  id: 3,
  category_id: 7,
  target_amount: 5000,
  currency: 'EUR',
  start_date: '2026-03-01',
  target_date: '2026-12-31',
  created_at: '2026-03-01 10:00:00',
};

const categories = [{ id: 7, name: 'Travel', icon: 'flight', color: '#2196F3' }];

describe('isLegacyGoal', () => {
  it('tells an old category goal from a bucket goal', () => {
    // Given one goal of each shape
    const bucket = { id: 1, name: 'Car', icon: 'directions-car', color: '#000', account_id: 1, target_amount: 1, target_date: null, archived_at: null, created_at: '' };

    // Then only the category-based one is legacy
    expect(isLegacyGoal(legacy)).toBe(true);
    expect(isLegacyGoal(bucket)).toBe(false);
  });
});

describe('convertLegacyGoal', () => {
  it('names the goal after its category and keeps target and deadline', () => {
    // Given a legacy Travel goal and a EUR account
    const converted = convertLegacyGoal(legacy, categories, [{ id: 2, currency: 'EUR' }]);

    // Then the category's look carries over and the goal sits in that account
    expect(converted).toEqual({
      name: 'Travel',
      icon: 'flight',
      color: '#2196F3',
      account_id: 2,
      target_amount: 5000,
      target_date: '2026-12-31',
      archived_at: null,
      created_at: '2026-03-01 10:00:00',
    });
  });

  it('picks the first account of the goal\'s currency', () => {
    // Given accounts in USD and two in EUR, listed out of id order
    const accounts = [{ id: 9, currency: 'EUR' }, { id: 1, currency: 'USD' }, { id: 4, currency: 'EUR' }];

    // When converting a EUR goal
    // Then the lowest-id EUR account wins, same as the migration
    expect(convertLegacyGoal(legacy, categories, accounts)?.account_id).toBe(4);
  });

  it('falls back to the first account when none match the currency', () => {
    // Given only USD accounts
    // When converting a EUR goal
    // Then it lands in the first account rather than being lost
    expect(convertLegacyGoal(legacy, categories, [{ id: 5, currency: 'USD' }, { id: 2, currency: 'USD' }])?.account_id).toBe(2);
  });

  it('drops the goal when there is no account at all', () => {
    // Given a backup with no accounts
    // Then there is nowhere to put the goal
    expect(convertLegacyGoal(legacy, categories, [])).toBeNull();
  });

  it('uses a neutral look when the category is missing', () => {
    // Given a goal pointing at a category not in the backup
    const converted = convertLegacyGoal(legacy, [], [{ id: 1, currency: 'EUR' }]);

    // Then it still converts with a generic name, icon and colour
    expect(converted).toMatchObject({ name: 'Goal', icon: 'savings', color: '#009688' });
  });
});
