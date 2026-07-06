export const INTERVAL_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
} as const;

export type BackupFrequencyInterval = keyof typeof INTERVAL_MS;

export function isBackupDue(lastBackupAt: string | null, frequency: BackupFrequencyInterval): boolean {
  if (!lastBackupAt) return true;
  const elapsed = Date.now() - new Date(lastBackupAt).getTime();
  return elapsed >= INTERVAL_MS[frequency];
}
