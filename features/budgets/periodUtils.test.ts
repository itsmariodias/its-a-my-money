import { currentPeriodRange, spentInRange, periodLabel } from './periodUtils';

describe('currentPeriodRange', () => {
  describe('weekly', () => {
    it('returns Monday–Sunday when today is mid-week', () => {
      // Given a Wednesday 2026-06-10
      const today = new Date(2026, 5, 10);
      // When asking for the weekly range
      const range = currentPeriodRange('weekly', today);
      // Then it spans Monday 2026-06-08 to Sunday 2026-06-14
      expect(range).toEqual({ start: '2026-06-08', end: '2026-06-14' });
    });

    it('returns same Monday–Sunday when today is Monday', () => {
      // Given Monday 2026-06-08
      const today = new Date(2026, 5, 8);
      const range = currentPeriodRange('weekly', today);
      expect(range).toEqual({ start: '2026-06-08', end: '2026-06-14' });
    });

    it('returns prior Monday through today when today is Sunday', () => {
      // Given Sunday 2026-06-14
      const today = new Date(2026, 5, 14);
      const range = currentPeriodRange('weekly', today);
      expect(range).toEqual({ start: '2026-06-08', end: '2026-06-14' });
    });

    it('crosses a month boundary correctly', () => {
      // Given Tuesday 2026-07-01 → Monday is 2026-06-30
      const today = new Date(2026, 6, 1);
      const range = currentPeriodRange('weekly', today);
      expect(range).toEqual({ start: '2026-06-29', end: '2026-07-05' });
    });
  });

  describe('monthly', () => {
    it('returns 1st through last day of the current month', () => {
      // Given any day in March 2026
      const today = new Date(2026, 2, 15);
      const range = currentPeriodRange('monthly', today);
      expect(range).toEqual({ start: '2026-03-01', end: '2026-03-31' });
    });

    it('handles February in a non-leap year', () => {
      const today = new Date(2026, 1, 5);
      const range = currentPeriodRange('monthly', today);
      expect(range).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    });

    it('handles February in a leap year', () => {
      const today = new Date(2024, 1, 5);
      const range = currentPeriodRange('monthly', today);
      expect(range).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    });
  });

  describe('yearly', () => {
    it('returns Jan 1 through Dec 31', () => {
      const today = new Date(2026, 5, 10);
      const range = currentPeriodRange('yearly', today);
      expect(range).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    });
  });
});

describe('spentInRange', () => {
  const txs = [
    { type: 'expense' as const, category_id: 1, account_id: 1, amount: 10, date: '2026-03-05' },
    { type: 'expense' as const, category_id: 1, account_id: 1, amount: 20, date: '2026-03-15' },
    { type: 'expense' as const, category_id: 2, account_id: 1, amount: 100, date: '2026-03-10' }, // different category
    { type: 'income' as const, category_id: 1, account_id: 1, amount: 500, date: '2026-03-10' },   // income excluded
    { type: 'expense' as const, category_id: 1, account_id: 1, amount: 999, date: '2026-02-28' },  // out of range (before)
    { type: 'expense' as const, category_id: 1, account_id: 1, amount: 999, date: '2026-04-01' },  // out of range (after)
  ];

  it('sums only expenses for the given category within the range', () => {
    // When summing March for category 1
    const total = spentInRange(txs, 1, '2026-03-01', '2026-03-31');
    // Then only the two in-range expenses count
    expect(total).toBe(30);
  });

  it('includes transactions on the boundary dates', () => {
    const range = [
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 10, date: '2026-03-01' },
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 20, date: '2026-03-31' },
    ];
    expect(spentInRange(range, 1, '2026-03-01', '2026-03-31')).toBe(30);
  });

  it('returns 0 when no transactions match', () => {
    expect(spentInRange(txs, 99, '2026-03-01', '2026-03-31')).toBe(0);
  });
});

describe('periodLabel', () => {
  it('returns capitalized label for each period', () => {
    expect(periodLabel('weekly')).toBe('Weekly');
    expect(periodLabel('monthly')).toBe('Monthly');
    expect(periodLabel('yearly')).toBe('Yearly');
  });
});

describe('spentInRange — currency filter', () => {
  it('only counts expenses whose account currency matches the filter', () => {
    const txs = [
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 50, date: '2026-03-05' }, // USD
      { type: 'expense' as const, category_id: 1, account_id: 2, amount: 30, date: '2026-03-06' }, // EUR
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 20, date: '2026-03-15' }, // USD
    ];
    const accountCurrencyById = { 1: 'USD', 2: 'EUR' };
    const usd = spentInRange(txs, 1, '2026-03-01', '2026-03-31', { currency: 'USD', accountCurrencyById });
    const eur = spentInRange(txs, 1, '2026-03-01', '2026-03-31', { currency: 'EUR', accountCurrencyById });
    expect(usd).toBe(70);
    expect(eur).toBe(30);
  });

  it('counts all transactions when no currency filter is passed', () => {
    const txs = [
      { type: 'expense' as const, category_id: 1, account_id: 1, amount: 50, date: '2026-03-05' },
      { type: 'expense' as const, category_id: 1, account_id: 2, amount: 30, date: '2026-03-06' },
    ];
    expect(spentInRange(txs, 1, '2026-03-01', '2026-03-31')).toBe(80);
  });
});
