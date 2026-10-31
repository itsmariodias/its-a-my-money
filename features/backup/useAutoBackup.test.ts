import { formatRelativeTime, isBackupDue } from './backupSchedule';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
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
    it('is not due before the same day next month', () => {
      // Given a backup on Jun 7, When checking on Jul 6, Then it is not due yet
      expect(isBackupDue(agoIso(29 * DAY), 'monthly')).toBe(false);
    });

    it('is due on the same day next month', () => {
      // Given a backup on Jun 6, When checking on Jul 6, Then it is due
      expect(isBackupDue(agoIso(30 * DAY), 'monthly')).toBe(true);
    });

    it('counts calendar months, not 30 days', () => {
      // Given a backup on Jan 31
      // When checking on Feb 28 (28 days later), Then it is due — February has no 31st
      jest.setSystemTime(new Date('2026-02-28T12:00:00.000Z'));
      expect(isBackupDue('2026-01-31T12:00:00.000Z', 'monthly')).toBe(true);
      // When checking on Mar 30 from a Mar 1 backup (29 days later), Then it is not due until Apr 1
      jest.setSystemTime(new Date('2026-03-30T12:00:00.000Z'));
      expect(isBackupDue('2026-03-01T12:00:00.000Z', 'monthly')).toBe(false);
    });
  });

  it('is not due when the last backup is timestamped in the future (clock skew)', () => {
    // Given a clock-skewed future timestamp, Then no backup is due (elapsed is negative)
    expect(isBackupDue(agoIso(-HOUR), 'daily')).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-07-06T12:00:00.000Z');
  const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

  it('says never when there has been no backup', () => {
    expect(formatRelativeTime(null, 'DD/MM/YYYY', NOW)).toBe('Never');
  });

  it('counts minutes, then hours, then days', () => {
    // Given backups at growing distances from now
    // Then each uses the largest whole unit below the next step up
    expect(formatRelativeTime(ago(30 * 1000), 'DD/MM/YYYY', NOW)).toBe('Just now');
    expect(formatRelativeTime(ago(5 * MINUTE), 'DD/MM/YYYY', NOW)).toBe('5m ago');
    expect(formatRelativeTime(ago(59 * MINUTE), 'DD/MM/YYYY', NOW)).toBe('59m ago');
    expect(formatRelativeTime(ago(HOUR), 'DD/MM/YYYY', NOW)).toBe('1h ago');
    expect(formatRelativeTime(ago(23 * HOUR + 59 * MINUTE), 'DD/MM/YYYY', NOW)).toBe('23h ago');
    expect(formatRelativeTime(ago(DAY), 'DD/MM/YYYY', NOW)).toBe('1d ago');
    expect(formatRelativeTime(ago(29 * DAY), 'DD/MM/YYYY', NOW)).toBe('29d ago');
  });

  it('shows the date once it is 30 days or more ago', () => {
    // Given a backup at local noon on May 1
    // Then the date is that local day in the user's format
    const mayFirst = new Date(2026, 4, 1, 12).toISOString();
    expect(formatRelativeTime(mayFirst, 'DD MMM YYYY', NOW)).toBe('01 May 2026');
  });

  it('shows the local day, not the UTC one, for a late-evening backup', () => {
    // Given a backup at 23:30 local time
    // Then the date shown is that local day (the UTC date can be the next one)
    const lateEvening = new Date(2026, 4, 1, 23, 30).toISOString();
    expect(formatRelativeTime(lateEvening, 'YYYY-MM-DD', NOW)).toBe('2026-05-01');
  });

  it('says just now for a timestamp in the future (clock skew)', () => {
    expect(formatRelativeTime(ago(-HOUR), 'DD/MM/YYYY', NOW)).toBe('Just now');
  });
});
