import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let channelCreated = false;

async function ensureChannel() {
  if (channelCreated || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('backup', {
    name: 'Backup',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Google Drive backup notifications',
  });
  channelCreated = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifyBackupStarted(): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "It's a My Money!",
      body: 'Backing up to Google Drive...',
      ...(Platform.OS === 'android' && { channelId: 'backup' }),
    },
    trigger: null,
  });
}

export async function notifyBackupCompleted(success: boolean, error?: string): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "It's a My Money!",
      body: success
        ? 'Backup to Google Drive completed successfully.'
        : `Backup failed: ${error ?? 'Unknown error'}`,
      ...(Platform.OS === 'android' && { channelId: 'backup' }),
    },
    trigger: null,
  });
}
