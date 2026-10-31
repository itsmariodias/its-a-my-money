import { addDays, addMonths, addWeeks, differenceInDays, differenceInHours, differenceInMinutes, isBefore, parseISO } from 'date-fns';
import { formatDate, type DateFormatId } from '@/constants/dateFormats';
import { toDay } from '@/shared/dates';

/** When the next backup is due, given the last one. Monthly is the same day next month. */
const NEXT_BACKUP = {
  daily: (last: Date) => addDays(last, 1),
  weekly: (last: Date) => addWeeks(last, 1),
  monthly: (last: Date) => addMonths(last, 1),
} as const;

export type BackupFrequencyInterval = keyof typeof NEXT_BACKUP;

export function isBackupDue(lastBackupAt: string | null, frequency: BackupFrequencyInterval): boolean {
  if (!lastBackupAt) return true;
  return !isBefore(new Date(), NEXT_BACKUP[frequency](parseISO(lastBackupAt)));
}

/** "Just now" / "5m ago" / "3h ago" / "12d ago", then the local day in the user's format. */
export function formatRelativeTime(isoDate: string | null, dateFormat: DateFormatId, now: Date = new Date()): string {
  if (!isoDate) return 'Never';
  const then = parseISO(isoDate);
  const minutes = differenceInMinutes(now, then);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = differenceInHours(now, then);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(now, then);
  if (days < 30) return `${days}d ago`;
  return formatDate(toDay(then), dateFormat);
}
