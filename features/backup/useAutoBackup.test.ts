import { isBackupDue } from './backupSchedule';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('isBackupDue', () => {
  const NOW = new Date('2026-07-06T12:00:00.000Z').getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function agoIso(ms: number): string {
    return new Date(NOW - ms).toISOString();
  }

  it('is due when there has never been a backup', () => {
    // Given no prior backup, When checking any frequency, Then a backup is due
    expect(isBackupDue(null, 'daily')).toBe(true);
    expect(isBackupDue(null, 'weekly')).toBe(true);
    expect(isBackupDue(null, 'monthly')).toBe(true);
  });

  describe('daily', () => {
    it('is not due when the last backup was less than a day ago', () => {
      expect(isBackupDue(agoIso(23 * HOUR), 'daily')).toBe(false);
    });

    it('is due once a full day has elapsed', () => {
      expect(isBackupDue(agoIso(DAY), 'daily')).toBe(true);
      expect(isBackupDue(agoIso(DAY + HOUR), 'daily')).toBe(true);
    });
  });

  describe('weekly', () => {
    it('is not due within the same week', () => {
      expect(isBackupDue(agoIso(6 * DAY), 'weekly')).toBe(false);
    });

    it('is due after seven days', () => {
      expect(isBackupDue(agoIso(7 * DAY), 'weekly')).toBe(true);
    });
  });

  describe('monthly', () => {
    it('is not due within the 30-day window', () => {
      expect(isBackupDue(agoIso(29 * DAY), 'monthly')).toBe(false);
    });

    it('is due after 30 days', () => {
      expect(isBackupDue(agoIso(30 * DAY), 'monthly')).toBe(true);
    });
  });

  it('is not due when the last backup is timestamped in the future (clock skew)', () => {
    // Given a clock-skewed future timestamp, Then no backup is due (elapsed is negative)
    expect(isBackupDue(agoIso(-HOUR), 'daily')).toBe(false);
  });
});
