import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { GoalWithDetails } from '@/types';
import { formatAmount } from '@/constants/currencies';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import type { OverspentAccount } from './goalCrossings';

export { findOverspentAccounts, findReachedGoals } from './goalCrossings';

let channelCreated = false;

async function ensureChannel(): Promise<void> {
  if (channelCreated || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('goals', {
    name: 'Goals',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Goal completion and overspend alerts',
  });
  channelCreated = true;
}

export async function notifyGoalReached(goal: GoalWithDetails): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Goal reached',
      body: `You have saved enough for ${goal.name}.`,
      ...(Platform.OS === 'android' && { channelId: 'goals' }),
    },
    trigger: null,
  });
}

export async function notifyReachedGoals(reached: GoalWithDetails[]): Promise<void> {
  for (const g of reached) {
    await notifyGoalReached(g);
  }
}

/** "Goal money spent" — a save left an account with less than its goals hold. */
export async function notifyOverspentAccounts(overspent: OverspentAccount[]): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await ensureChannel();
  const numberFormat = useSettingsStore.getState().numberFormat;
  for (const { account, available } of overspent) {
    const short = formatAmount(Math.abs(available), account.currency || 'USD', undefined, numberFormat);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goal money spent',
        body: `${account.name} now has ${short} less than its goals hold.`,
        ...(Platform.OS === 'android' && { channelId: 'goals' }),
      },
      trigger: null,
    });
  }
}
