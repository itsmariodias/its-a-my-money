import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { BudgetWithDetails } from '@/types';
import { periodLabel } from './periodUtils';

export { findCrossings } from './budgetCrossings';

let channelCreated = false;

async function ensureChannel(): Promise<void> {
  if (channelCreated || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('budgets', {
    name: 'Budgets',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Budget threshold alerts',
  });
  channelCreated = true;
}

export async function notifyBudgetExceeded(budget: BudgetWithDetails): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budget exceeded',
      body: `${budget.category_name} has reached its ${periodLabel(budget.period).toLowerCase()} limit.`,
      ...(Platform.OS === 'android' && { channelId: 'budgets' }),
    },
    trigger: null,
  });
}

export async function notifyCrossedBudgets(crossed: BudgetWithDetails[]): Promise<void> {
  for (const b of crossed) {
    await notifyBudgetExceeded(b);
  }
}
