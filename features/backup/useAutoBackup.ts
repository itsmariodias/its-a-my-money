import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBackupStore } from './useBackupStore';
import { useSettingsDb } from '@/db';
import { getAccessToken, uploadBackup } from './googleDrive';
import { generateExportJson } from '@/features/settings/exportData';
import { notifyBackupStarted, dismissBackupNotification } from './notifications';
import { isBackupDue } from './backupSchedule';

export function useAutoBackup() {
  const db = useSQLiteContext();
  const settingsDb = useSettingsDb();
  const isRunningRef = useRef(false);

  const maybeBackup = useCallback(async () => {
    if (isRunningRef.current) return;

    const {
      googleDriveEnabled, folderId, backupFrequency, lastBackupAt,
      setIsBackingUp, setLastBackupAt, setLastError,
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
      await dismissBackupNotification();
    } catch (e: any) {
      await dismissBackupNotification();
      setLastError(e?.message ?? 'Auto backup failed');
    } finally {
      setIsBackingUp(false);
      isRunningRef.current = false;
    }
  }, [db, settingsDb]);

  // Re-foreground: back up when returning to the app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') maybeBackup();
    });
    return () => subscription.remove();
  }, [maybeBackup]);

  // Cold launch: AppState is already 'active', so no 'change' event fires.
  // Run the due-check once the backup settings have hydrated from SQLite.
  useEffect(() => {
    const run = () => {
      const { googleDriveEnabled, folderId } = useBackupStore.getState();
      if (googleDriveEnabled && folderId) {
        unsubscribe();
        maybeBackup();
      }
    };
    const unsubscribe = useBackupStore.subscribe(run);
    run(); // in case settings were already loaded before we subscribed
    return unsubscribe;
  }, [maybeBackup]);
}
