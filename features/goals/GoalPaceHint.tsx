import { StyleSheet } from 'react-native';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { todayString } from '@/features/recurring/dateUtils';
import { isActiveGoal, monthlyNeeded } from './goalUtils';
import type { GoalWithDetails } from '@/types';

interface Props {
  goal: Pick<GoalWithDetails, 'saved' | 'target_amount' | 'target_date' | 'archived_at' | 'account_currency'>;
}

/** "€250/month to reach it by the target date" — nothing for goals with no date, done, or overdue. */
export default function GoalPaceHint({ goal }: Props) {
  const { subColor } = useAppTheme();
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const perMonth = isActiveGoal(goal) ? monthlyNeeded(goal, todayString()) : null;
  if (perMonth === null) return null;
  return (
    <Text style={[styles.hint, { color: subColor }]} numberOfLines={1}>
      {formatAmount(perMonth, goal.account_currency, undefined, numberFormat)}/month to reach it on time
    </Text>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12 },
});
