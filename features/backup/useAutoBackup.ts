import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBackupStore } from './useBackupStore';
import { useSettingsDb } from '@/db';
import { getAccessToken, uploadBackup } from './googleDrive';
import { generateExportJson } from '@/features/settings/exportData';
import { notifyBackupStarted, notifyBackupCompleted } from './notifications';

const INTERVAL_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
} as const;

function isBackupDue(lastBackupAt: string | null, frequency: keyof typeof INTERVAL_MS): boolean {
  if (!lastBackupAt) return true;
  const elapsed = Date.now() - new Date(lastBackupAt).getTime();
  return elapsed >= INTERVAL_MS[frequency];
}

export function useAutoBackup() {
  const db = useSQLiteContext();
  const settingsDb = useSettingsDb();
  const isRunningRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') return;
      if (isRunningRef.current) return;

      const {
        googleDriveEnabled, folderId, backupFrequency, lastBackupAt,
        setIsBackingUp, setLastBackupAt,
      } = useBackupStore.getState();

      if (!googleDriveEnabled || !folderId) return;
      if (!isBackupDue(lastBackupAt, backupFrequency)) return;

      isRunningRef.current = true;
      setIsBackingUp(true);

      try {
        await notifyBackupStarted();
        const token = await getAccessToken();
        const json = await generateExportJson(db);
        await uploadBackup(token, folderId, json);

        const now = new Date().toISOString();
        setLastBackupAt(now);
        await settingsDb.set('last_backup_at', now);
        await notifyBackupCompleted(true);
      } catch (e: any) {
        console.error('Auto backup failed:', e);
        await notifyBackupCompleted(false, e?.message);
      } finally {
        setIsBackingUp(false);
        isRunningRef.current = false;
      }
    });

    return () => subscription.remove();
  }, [db, settingsDb]);
}
