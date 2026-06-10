import { formatDate, isValidDateFormat, DEFAULT_DATE_FORMAT } from './dateFormats';

describe('formatDate', () => {
  const d = '2026-03-28';

  it('formats DD/MM/YYYY', () => {
    expect(formatDate(d, 'DD/MM/YYYY')).toBe('28/03/2026');
  });

  it('formats MM/DD/YYYY', () => {
    expect(formatDate(d, 'MM/DD/YYYY')).toBe('03/28/2026');
  });

  it('formats YYYY-MM-DD', () => {
    expect(formatDate(d, 'YYYY-MM-DD')).toBe('2026-03-28');
  });

  it('formats DD MMM YYYY', () => {
    expect(formatDate(d, 'DD MMM YYYY')).toBe('28 Mar 2026');
  });

  it('formats MMM DD, YYYY', () => {
    expect(formatDate(d, 'MMM DD, YYYY')).toBe('Mar 28, 2026');
  });

  it('defaults to DD/MM/YYYY when no format passed', () => {
    expect(formatDate(d)).toBe('28/03/2026');
    expect(DEFAULT_DATE_FORMAT).toBe('DD/MM/YYYY');
  });

  it('returns input unchanged for invalid date strings', () => {
    expect(formatDate('not-a-date', 'DD/MM/YYYY')).toBe('not-a-date');
    expect(formatDate('2026/03/28', 'DD/MM/YYYY')).toBe('2026/03/28');
    expect(formatDate('', 'DD/MM/YYYY')).toBe('');
  });

  it('returns input unchanged when month is out of range', () => {
    expect(formatDate('2026-13-01', 'DD MMM YYYY')).toBe('2026-13-01');
  });

  it('handles January and December correctly', () => {
    expect(formatDate('2026-01-15', 'MMM DD, YYYY')).toBe('Jan 15, 2026');
    expect(formatDate('2026-12-31', 'DD MMM YYYY')).toBe('31 Dec 2026');
  });
});

describe('isValidDateFormat', () => {
  it('accepts all supported format ids', () => {
    expect(isValidDateFormat('DD/MM/YYYY')).toBe(true);
    expect(isValidDateFormat('MM/DD/YYYY')).toBe(true);
    expect(isValidDateFormat('YYYY-MM-DD')).toBe(true);
    expect(isValidDateFormat('DD MMM YYYY')).toBe(true);
    expect(isValidDateFormat('MMM DD, YYYY')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isValidDateFormat('dd-mm-yyyy')).toBe(false);
    expect(isValidDateFormat('')).toBe(false);
    expect(isValidDateFormat('YYYY/MM/DD')).toBe(false);
  });
});
