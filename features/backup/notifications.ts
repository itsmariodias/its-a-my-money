import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Allow notifications to display while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

const BACKUP_PROGRESS_ID = 'backup-progress';

export async function notifyBackupStarted(): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: BACKUP_PROGRESS_ID,
    content: {
      title: "It's a My Money!",
      body: 'Syncing to Google Drive...',
      ...(Platform.OS === 'android' && {
        channelId: 'backup',
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.LOW,
      }),
    },
    trigger: null,
  });
}

export async function dismissBackupNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(BACKUP_PROGRESS_ID);
}
