import {
  addDays,
  daysBetween,
  firstDayOfMonth,
  monthKeyOf,
  previousDay,
  shiftMonth,
  todayString,
  toDay,
  withYear,
  yearOfMonth,
} from './dates';

describe('previousDay', () => {
  it('given a mid-month date, when stepping back, then returns the day before', () => {
    expect(previousDay('2025-03-15')).toBe('2025-03-14');
  });

  it('given the first of a month, when stepping back, then returns the last day of the previous month', () => {
    expect(previousDay('2025-03-01')).toBe('2025-02-28');
  });

  it('given Jan 1, when stepping back, then rolls back to Dec 31 of the previous year', () => {
    expect(previousDay('2025-01-01')).toBe('2024-12-31');
  });

  it('given Mar 1 of a leap year, when stepping back, then returns Feb 29', () => {
    expect(previousDay('2024-03-01')).toBe('2024-02-29');
  });
});

describe('addDays', () => {
  it('moves forward and back across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-10-31', 90)).toBe('2027-01-29');
  });
});

describe('daysBetween', () => {
  it('counts calendar days, negative when going back', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
    expect(daysBetween('2026-03-01', '2026-02-01')).toBe(-28);
    // Across a DST change (late March in Europe)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});

describe('shiftMonth', () => {
  it('crosses year boundaries both ways', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 3)).toBe('2027-02');
    expect(shiftMonth('2026-06', -18)).toBe('2024-12');
  });
});

describe('toDay', () => {
  it('formats the local calendar day, not the UTC one', () => {
    // Given 23:30 local time on Oct 31
    // Then the day is Oct 31 whatever the time zone (toISOString would roll it over to UTC)
    expect(toDay(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
    expect(toDay(new Date(2026, 9, 31, 0, 15))).toBe('2026-10-31');
  });
});

describe('todayString', () => {
  it('is today as YYYY-MM-DD', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayString()).toBe(toDay(new Date()));
  });
});

describe('monthKeyOf', () => {
  it('is the YYYY-MM month a day falls in', () => {
    expect(monthKeyOf('2026-10-31')).toBe('2026-10');
  });
});

describe('date picker month helpers', () => {
  it('reads the year of a month', () => {
    expect(yearOfMonth('2026-10')).toBe(2026);
    expect(yearOfMonth('1977-01')).toBe(1977);
  });

  it('moves a month to another year, keeping the month', () => {
    // Given October 2026 showing in the calendar
    // When 1999 is picked in the year grid
    // Then the calendar shows October 1999
    expect(withYear('2026-10', 1999)).toBe('1999-10');
    expect(withYear('2024-02', 2025)).toBe('2025-02');
  });

  it('gives the first day of a month for the calendar to open on', () => {
    expect(firstDayOfMonth('2026-10')).toBe('2026-10-01');
    expect(firstDayOfMonth('2028-02')).toBe('2028-02-01');
  });
});
