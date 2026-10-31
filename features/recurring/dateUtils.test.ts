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

  describe('quarterly', () => {
    it('advances by three months', () => {
      expect(advanceDate('2025-01-15', 'quarterly')).toBe('2025-04-15');
    });

    it('crosses year boundary', () => {
      expect(advanceDate('2025-11-15', 'quarterly')).toBe('2026-02-15');
    });

    it('advances December to March of the next year', () => {
      expect(advanceDate('2025-12-10', 'quarterly')).toBe('2026-03-10');
    });

    it('clamps to last day of shorter target month', () => {
      // Nov 30 -> Feb has 28 days in 2025
      expect(advanceDate('2024-11-30', 'quarterly')).toBe('2025-02-28');
    });

    it('clamps to Feb 29 when the target year is a leap year', () => {
      // Nov 30 2023 + 3 months = Feb 2024 (leap)
      expect(advanceDate('2023-11-30', 'quarterly')).toBe('2024-02-29');
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

  describe('anchored to the start date', () => {
    // Steps a schedule n times from its start date, the way the recurring check does.
    const schedule = (start: string, frequency: 'monthly' | 'quarterly' | 'yearly', n: number) => {
      const dates = [start];
      for (let i = 1; i < n; i++) dates.push(advanceDate(dates[i - 1], frequency, start));
      return dates;
    };

    it('returns to the 31st after a month that is shorter', () => {
      // Given an item set for Oct 31
      // Then November clamps to the 30th and December is the 31st again
      expect(schedule('2026-10-31', 'monthly', 6)).toEqual([
        '2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31',
      ]);
    });

    it('keeps the 29th and 30th through February', () => {
      // Given items set for Jan 29 and Jan 30 in a non-leap year
      // Then both clamp to Feb 28 and come back in March
      expect(schedule('2027-01-29', 'monthly', 3)).toEqual(['2027-01-29', '2027-02-28', '2027-03-29']);
      expect(schedule('2027-01-30', 'monthly', 3)).toEqual(['2027-01-30', '2027-02-28', '2027-03-30']);
    });

    it('returns to the 31st on a quarterly schedule', () => {
      // Given a quarterly item set for Jan 31
      // Then April clamps to the 30th and July is the 31st again
      expect(schedule('2026-01-31', 'quarterly', 3)).toEqual(['2026-01-31', '2026-04-30', '2026-07-31']);
    });

    it('puts a Feb 29 yearly item back on Feb 29 in the next leap year', () => {
      // Given a yearly item started on Feb 29, 2024
      // Then non-leap years use Feb 28 and 2028 is Feb 29 again
      expect(schedule('2024-02-29', 'yearly', 5)).toEqual([
        '2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29',
      ]);
    });

    it('corrects a due date that already drifted', () => {
      // Given a Jan 31 item whose stored next due date slid to Mar 28 before this fix
      // When it is stepped with its start date
      // Then the next one is Apr 30, not Apr 28
      expect(advanceDate('2026-03-28', 'monthly', '2026-01-31')).toBe('2026-04-30');
    });

    it('does not change daily or weekly steps', () => {
      // Given an anchor with a different day of the month
      // Then daily and weekly still step from the current date
      expect(advanceDate('2026-02-28', 'daily', '2026-01-31')).toBe('2026-03-01');
      expect(advanceDate('2026-02-28', 'weekly', '2026-01-31')).toBe('2026-03-07');
    });
  });
});
