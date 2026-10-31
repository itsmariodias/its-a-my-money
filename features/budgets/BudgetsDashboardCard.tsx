import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import DashboardCard from '@/shared/components/DashboardCard';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useBudgetsStore } from './useBudgetsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useRecurringStore } from '@/features/recurring/useRecurringStore';
import { buildAccountCurrencyMap } from '@/features/accounts/currencyUtils';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { formatDate } from '@/constants/dateFormats';
import { currentPeriodRange, spentInRange, periodLabel } from './periodUtils';
import type { BudgetWithDetails } from '@/types';
import { budgetStatusColor, BUDGET_WARNING_COLOR } from './budgetStatus';
import { budgetPace, type BudgetPace } from './budgetPace';

interface Props {
  onPress: () => void;
}

interface BudgetRowData {
  budget: BudgetWithDetails;
  spent: number;
  pct: number;
  pace: BudgetPace | null;
}

export default function BudgetsDashboardCard({ onPress }: Props) {
  const budgets = useBudgetsStore((s) => s.budgets);
  const transactions = useTransactionsStore((s) => s.transactions);
  const accounts = useAccountsStore((s) => s.accounts);
  const recurring = useRecurringStore((s) => s.recurringTransactions);
  const globalCurrency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const { textColor, subColor, borderColor, accentColor } = useAppTheme();

  const accountCurrencyById = useMemo(
    () => buildAccountCurrencyMap(accounts, globalCurrency),
    [accounts, globalCurrency],
  );

  const rows: BudgetRowData[] = useMemo(() => {
    return budgets.map((b) => {
      const { start, end } = currentPeriodRange(b.period);
      const currencyFilter = { currency: b.currency || globalCurrency, accountCurrencyById };
      const spent = spentInRange(transactions, b.category_id, start, end, currencyFilter);
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const pace = budgetPace(b, transactions, recurring, currencyFilter);
      return { budget: b, spent, pct, pace };
    });
  }, [budgets, transactions, recurring, accountCurrencyById, globalCurrency]);

  if (budgets.length === 0) return null;

  return (
    <DashboardCard onPress={onPress} accessibilityLabel="Open budgets">
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Budgets</Text>
        <MaterialIcons name="chevron-right" size={20} color={subColor} />
      </View>

      {rows.map(({ budget, spent, pct, pace }) => {
        const color = budgetStatusColor(pct);
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
              {formatAmount(spent, budget.currency || globalCurrency, undefined, numberFormat)} / {formatAmount(budget.amount, budget.currency || globalCurrency, undefined, numberFormat)}
            </Text>
            {pace && (
              <Text style={[styles.rowPace, { color: BUDGET_WARNING_COLOR }]}>
                On pace for {formatAmount(pace.projected, budget.currency || globalCurrency, undefined, numberFormat)} — over by ~{formatDate(pace.overOn, dateFormat)}
              </Text>
            )}
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
  rowPace: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  periodBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  periodBadgeText: { fontSize: 10, fontWeight: '600' },
});
