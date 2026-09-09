import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { GoalWithDetails } from '@/types';

export { findReachedGoals } from './goalCrossings';

let channelCreated = false;

async function ensureChannel(): Promise<void> {
  if (channelCreated || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('goals', {
    name: 'Goals',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Goal completion alerts',
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
      body: `You have reached your ${goal.category_name} goal.`,
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
