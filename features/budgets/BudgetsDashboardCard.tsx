import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useBudgetsStore } from './useBudgetsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { currentPeriodRange, spentInRange, periodLabel } from './periodUtils';
import type { BudgetWithDetails } from '@/types';

const STATUS_GREEN = '#4CAF50';
const STATUS_AMBER = '#FFC107';
const STATUS_RED = '#F44336';

function statusColor(pct: number): string {
  if (pct >= 100) return STATUS_RED;
  if (pct >= 80) return STATUS_AMBER;
  return STATUS_GREEN;
}

interface Props {
  onPress: () => void;
}

interface BudgetRowData {
  budget: BudgetWithDetails;
  spent: number;
  pct: number;
}

export default function BudgetsDashboardCard({ onPress }: Props) {
  const budgets = useBudgetsStore((s) => s.budgets);
  const transactions = useTransactionsStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const { cardBg, textColor, subColor, borderColor, accentColor } = useAppTheme();

  const rows: BudgetRowData[] = useMemo(() => {
    return budgets.map((b) => {
      const { start, end } = currentPeriodRange(b.period);
      const spent = spentInRange(transactions, b.category_id, start, end);
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      return { budget: b, spent, pct };
    });
  }, [budgets, transactions]);

  if (budgets.length === 0) return null;

  return (
    <TouchableOpacity
      style={[styles.section, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Open budgets"
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Budgets</Text>
        <MaterialIcons name="chevron-right" size={20} color={subColor} />
      </View>

      {rows.map(({ budget, spent, pct }) => {
        const color = statusColor(pct);
        const barPct = Math.min(100, pct);
        return (
          <View key={budget.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: budget.category_color }]}>
                  <MaterialIcons name={(budget.category_icon as any) || 'label'} size={14} color="#fff" />
                </View>
                <Text style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                  {budget.category_name}
                </Text>
                <View style={[styles.periodBadge, { backgroundColor: accentColor + '22' }]}>
                  <Text style={[styles.periodBadgeText, { color: accentColor }]}>
                    {periodLabel(budget.period)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowPct, { color }]}>{Math.round(pct)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
              <View style={[styles.progressFill, { width: `${barPct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.rowAmount, { color: subColor }]}>
              {formatAmount(spent, currency, undefined, numberFormat)} / {formatAmount(budget.amount, currency, undefined, numberFormat)}
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

  periodBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  periodBadgeText: { fontSize: 10, fontWeight: '600' },
});
