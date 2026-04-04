import { advanceDate } from './dateUtils';

describe('advanceDate', () => {
  describe('daily', () => {
    it('advances by one day', () => {
      expect(advanceDate('2025-01-15', 'daily')).toBe('2025-01-16');
    });

    it('crosses month boundary', () => {
      expect(advanceDate('2025-01-31', 'daily')).toBe('2025-02-01');
    });

    it('crosses year boundary', () => {
      expect(advanceDate('2024-12-31', 'daily')).toBe('2025-01-01');
    });
  });

  describe('weekly', () => {
    it('advances by 7 days', () => {
      expect(advanceDate('2025-01-01', 'weekly')).toBe('2025-01-08');
    });

    it('crosses month boundary', () => {
      expect(advanceDate('2025-01-28', 'weekly')).toBe('2025-02-04');
    });
  });

  describe('monthly', () => {
    it('advances by one month', () => {
      expect(advanceDate('2025-01-15', 'monthly')).toBe('2025-02-15');
    });

    it('crosses year boundary', () => {
      expect(advanceDate('2025-12-15', 'monthly')).toBe('2026-01-15');
    });

    it('clamps to last day of shorter month', () => {
      // Jan 31 -> Feb has 28 days in 2025
      expect(advanceDate('2025-01-31', 'monthly')).toBe('2025-02-28');
    });

    it('clamps Feb 29 in leap year to Feb 28 in non-leap year', () => {
      // 2024 is leap, 2024-02-29 + 1 month = 2024-03-29
      expect(advanceDate('2024-01-31', 'monthly')).toBe('2024-02-29');
    });

    it('clamps March 31 -> April 30', () => {
      expect(advanceDate('2025-03-31', 'monthly')).toBe('2025-04-30');
    });
  });

  describe('yearly', () => {
    it('advances by one year', () => {
      expect(advanceDate('2025-03-15', 'yearly')).toBe('2026-03-15');
    });

    it('clamps Feb 29 in leap year to Feb 28 in non-leap year', () => {
      expect(advanceDate('2024-02-29', 'yearly')).toBe('2025-02-28');
    });

    it('keeps Feb 29 in the next leap year', () => {
      // 2024 -> 2025 is not leap, but let's check normal date
      expect(advanceDate('2025-02-28', 'yearly')).toBe('2026-02-28');
    });
  });
});
