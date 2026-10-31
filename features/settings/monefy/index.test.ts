import { convertDate } from './index';

describe('convertDate', () => {
  it('turns a Monefy DD/MM/YYYY date into YYYY-MM-DD', () => {
    // Given dates as Monefy writes them
    // Then they come out in the app's stored format
    expect(convertDate('31/10/2026')).toBe('2026-10-31');
    expect(convertDate('01/02/2024')).toBe('2024-02-01');
  });

  it('pads single-digit days and months', () => {
    expect(convertDate('5/3/2026')).toBe('2026-03-05');
  });

  it('accepts Feb 29 only in a leap year', () => {
    expect(convertDate('29/02/2028')).toBe('2028-02-29');
    expect(convertDate('29/02/2027')).toBe('29/02/2027');
  });

  it('leaves anything that is not a real date as it came', () => {
    expect(convertDate('2026-10-31')).toBe('2026-10-31');
    expect(convertDate('31/13/2026')).toBe('31/13/2026');
    expect(convertDate('')).toBe('');
  });
});
