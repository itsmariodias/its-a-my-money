import { toDay } from './dates';
import { getDateRange, isCurrentPeriod, navigatePeriod, periodNavLabel, shortPeriodLabel } from './periodUtils';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
/** Every navigatePeriod call below runs as if today were Oct 31, 2026. */
const NOW = new Date(2026, 9, 31, 9, 30);

describe('navigatePeriod', () => {
  it('steps a month from the 31st to the neighbouring months', () => {
    // Given Oct 31 in month mode
    // When stepping back and forward
    // Then the months are September and November, not October and December
    expect(toDay(navigatePeriod('month', day(2026, 10, 31), -1, NOW))).toBe('2026-09-30');
    expect(toDay(navigatePeriod('month', day(2026, 10, 31), 1, NOW))).toBe('2026-11-30');
  });

  it('steps from Jan 31 into February', () => {
    expect(toDay(navigatePeriod('month', day(2026, 1, 31), 1, NOW))).toBe('2026-02-28');
    expect(toDay(navigatePeriod('month', day(2028, 1, 31), 1, NOW))).toBe('2028-02-29');
  });

  it('crosses the year boundary in month mode', () => {
    expect(toDay(navigatePeriod('month', day(2026, 12, 31), 1, NOW))).toBe('2027-01-31');
    expect(toDay(navigatePeriod('month', day(2026, 1, 15), -1, NOW))).toBe('2025-12-31');
  });

  it('lands on the last day of each month without drifting', () => {
    // Given Mar 31, 2026, stepped back through February and forward again
    // Then each month ends on its own last day, and March is back on the 31st
    let date = day(2026, 3, 31);
    for (let i = 0; i < 3; i++) date = navigatePeriod('month', date, -1, NOW);
    for (let i = 0; i < 3; i++) date = navigatePeriod('month', date, 1, NOW);
    expect(toDay(date)).toBe('2026-03-31');
    expect(toDay(navigatePeriod('month', day(2026, 3, 31), -1, NOW))).toBe('2026-02-28');
    expect(toDay(navigatePeriod('month', day(2026, 9, 30), 1, NOW))).toBe(toDay(NOW));
  });

  it('steps a year keeping the month, from Feb 29 too', () => {
    // Given Feb 29 in year mode
    // Then the neighbouring years end on Feb 28, not Mar 1
    expect(toDay(navigatePeriod('year', day(2028, 2, 29), 1, NOW))).toBe('2029-02-28');
    expect(toDay(navigatePeriod('year', day(2028, 2, 29), -1, NOW))).toBe('2027-02-28');
  });

  it('steps a day across month and year ends', () => {
    expect(toDay(navigatePeriod('day', day(2026, 10, 31), 1, NOW))).toBe('2026-11-01');
    expect(toDay(navigatePeriod('day', day(2026, 1, 1), -1, NOW))).toBe('2025-12-31');
  });

  it('lands on today when stepping back into the current period', () => {
    // Given today is Oct 31 and month mode stepped back to September
    // When stepping forward again
    // Then the date is today
    expect(navigatePeriod('month', day(2026, 9, 30), 1, NOW)).toBe(NOW);
    // And the same in year mode, coming back from Oct 31, 2025
    expect(navigatePeriod('year', day(2025, 10, 31), 1, NOW)).toBe(NOW);
  });

  it('does not change the date it was given', () => {
    const date = day(2026, 10, 31);
    navigatePeriod('month', date, -1, NOW);
    expect(toDay(date)).toBe('2026-10-31');
  });
});

describe('getDateRange', () => {
  it('covers one day in day mode', () => {
    expect(getDateRange('day', day(2026, 10, 31))).toEqual({ start: '2026-10-31', end: '2026-10-31' });
  });

  it('covers the whole month in month mode', () => {
    expect(getDateRange('month', day(2026, 2, 14))).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(getDateRange('month', day(2028, 2, 14))).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('covers the whole year in year mode', () => {
    expect(getDateRange('year', day(2026, 6, 1))).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('periodNavLabel', () => {
  it('labels each mode', () => {
    expect(periodNavLabel('day', day(2026, 10, 31))).toBe('Oct 31, 2026');
    expect(periodNavLabel('month', day(2026, 10, 31))).toBe('October 2026');
    expect(periodNavLabel('year', day(2026, 10, 31))).toBe('2026');
  });
});

describe('shortPeriodLabel', () => {
  it('names the current period relative to now', () => {
    const now = new Date();
    expect(shortPeriodLabel('day', now)).toBe('today');
    expect(shortPeriodLabel('month', now)).toBe('this month');
    expect(shortPeriodLabel('year', now)).toBe('this year');
  });

  it('names other periods by date', () => {
    expect(shortPeriodLabel('day', day(2020, 3, 5))).toBe('Mar 5');
    expect(shortPeriodLabel('month', day(2020, 3, 5))).toBe('Mar 2020');
    expect(shortPeriodLabel('year', day(2020, 3, 5))).toBe('2020');
  });
});

describe('isCurrentPeriod', () => {
  it('matches any day of the current month in month mode', () => {
    // Given today is Oct 31
    // Then any other day of October is still the current month
    expect(isCurrentPeriod('month', day(2026, 10, 1), NOW)).toBe(true);
    expect(isCurrentPeriod('month', day(2026, 9, 30), NOW)).toBe(false);
    expect(isCurrentPeriod('month', day(2025, 10, 31), NOW)).toBe(false);
  });

  it('matches only today in day mode', () => {
    expect(isCurrentPeriod('day', day(2026, 10, 31), NOW)).toBe(true);
    expect(isCurrentPeriod('day', day(2026, 10, 30), NOW)).toBe(false);
  });

  it('matches any day of the current year in year mode', () => {
    expect(isCurrentPeriod('year', day(2026, 1, 1), NOW)).toBe(true);
    expect(isCurrentPeriod('year', day(2025, 12, 31), NOW)).toBe(false);
  });
});
