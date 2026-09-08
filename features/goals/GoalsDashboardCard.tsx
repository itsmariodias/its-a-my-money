import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useGoalsStore } from './useGoalsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { buildAccountCurrencyMap } from '@/features/accounts/currencyUtils';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { todayString } from '@/features/recurring/dateUtils';
import { goalProgress, goalStatusColor, targetDateLabel } from './goalUtils';
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
  const goals = useGoalsStore((s) => s.goals);
  const transactions = useTransactionsStore((s) => s.transactions);
  const accounts = useAccountsStore((s) => s.accounts);
  const globalCurrency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const { cardBg, textColor, subColor, borderColor, accentColor } = useAppTheme();

  const accountCurrencyById = useMemo(
    () => buildAccountCurrencyMap(accounts, globalCurrency),
    [accounts, globalCurrency],
  );

  const today = todayString();

  const rows: GoalRowData[] = useMemo(() => {
    return goals.map((g) => {
      const { saved, pct } = goalProgress(g, transactions, {
        currency: g.currency || globalCurrency,
        accountCurrencyById,
      });
      return { goal: g, saved, pct };
    });
  }, [goals, transactions, accountCurrencyById, globalCurrency]);

  if (goals.length === 0) return null;

  return (
    <TouchableOpacity
      style={[styles.section, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Open goals"
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Goals</Text>
        <MaterialIcons name="chevron-right" size={20} color={subColor} />
      </View>

      {rows.map(({ goal, saved, pct }) => {
        const color = goalStatusColor(pct, goal.target_date, accentColor, today);
        const barPct = Math.min(100, pct);
        const dateLabel = targetDateLabel(goal.target_date, today);
        const currency = goal.currency || globalCurrency;
        return (
          <View key={goal.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: goal.category_color }]}>
                  <MaterialIcons name={(goal.category_icon as any) || 'label'} size={14} color="#fff" />
                </View>
                <Text style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                  {goal.category_name}
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
              {formatAmount(saved, currency, undefined, numberFormat)} / {formatAmount(goal.target_amount, currency, undefined, numberFormat)}
            </Text>
          </View>
        );
      })}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
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
