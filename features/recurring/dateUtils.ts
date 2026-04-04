import type { RecurringFrequency } from '@/types';

/**
 * Advance a YYYY-MM-DD date string by one frequency unit.
 * Monthly advancement clamps to the last day of the target month.
 */
export function advanceDate(current: string, frequency: RecurringFrequency): string {
  const [year, month, day] = current.split('-').map(Number);

  switch (frequency) {
    case 'daily': {
      const d = new Date(year, month - 1, day + 1);
      return formatDate(d);
    }
    case 'weekly': {
      const d = new Date(year, month - 1, day + 7);
      return formatDate(d);
    }
    case 'monthly': {
      const targetMonth = month === 12 ? 1 : month + 1;
      const targetYear = month === 12 ? year + 1 : year;
      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      const clampedDay = Math.min(day, lastDay);
      return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    }
    case 'yearly': {
      // Feb 29 in a non-leap year → Feb 28
      const targetYear = year + 1;
      const lastDay = new Date(targetYear, month, 0).getDate();
      const clampedDay = Math.min(day, lastDay);
      return `${String(targetYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    }
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function todayString(): string {
  return formatDate(new Date());
}
