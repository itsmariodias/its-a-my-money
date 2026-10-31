import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import DashboardCard from '@/shared/components/DashboardCard';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useGoalsStore } from './useGoalsStore';
import AccountIcon from '@/shared/components/AccountIcon';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useUIStore } from '@/shared/store/useUIStore';
import { formatAmount } from '@/constants/currencies';
import { todayString } from '@/shared/dates';
import { goalProgress, goalStatusColor, isActiveGoal, targetDateLabel } from './goalUtils';
import type { GoalWithDetails } from '@/types';

interface Props {
  onPress: () => void;
}

interface GoalRowData {
  goal: GoalWithDetails;
  saved: number;
  pct: number;
}

export default function GoalsDashboardCard({ onPress }: Props) {
  const allGoals = useGoalsStore((s) => s.goals);
  // Follows the header's account filter, like the rest of the dashboard.
  const selectedAccountId = useUIStore((s) => s.selectedAccountId);
  // Completed goals live only in the goals list.
  const goals = useMemo(
    () => allGoals.filter((g) => isActiveGoal(g) && (selectedAccountId == null || g.account_id === selectedAccountId)),
    [allGoals, selectedAccountId],
  );
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const { textColor, subColor, borderColor, accentColor } = useAppTheme();

  const today = todayString();

  const rows: GoalRowData[] = useMemo(() => {
    return goals.map((g) => ({ goal: g, ...goalProgress(g) }));
  }, [goals]);

  if (goals.length === 0) return null;

  return (
    <DashboardCard onPress={onPress} accessibilityLabel="Open goals">
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Goals</Text>
        <MaterialIcons name="chevron-right" size={20} color={subColor} />
      </View>

      {rows.map(({ goal, saved, pct }) => {
        const color = goalStatusColor(pct, goal.target_date, accentColor, today);
        const barPct = Math.min(100, pct);
        const dateLabel = targetDateLabel(goal.target_date, today);
        const currency = goal.account_currency;
        return (
          <View key={goal.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: goal.color }]}>
                  <AccountIcon name={goal.icon} size={14} color="#fff" />
                </View>
                <Text style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                  {goal.name}
                </Text>
                {dateLabel && (
                  <View style={[styles.dateBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.dateBadgeText, { color }]}>{dateLabel}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.rowPct, { color }]}>{Math.round(pct)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
              <View style={[styles.progressFill, { width: `${barPct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.rowAmount, { color: subColor }]}>
              {formatAmount(saved, currency, undefined, numberFormat)} / {formatAmount(goal.target_amount, currency, undefined, numberFormat)} · {goal.account_name}
            </Text>
          </View>
        );
      })}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600' },

  row: { marginBottom: 14 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  iconCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  rowPct: { fontSize: 13, fontWeight: '700' },
  rowAmount: { fontSize: 11, marginTop: 4 },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  dateBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  dateBadgeText: { fontSize: 10, fontWeight: '600' },
});
