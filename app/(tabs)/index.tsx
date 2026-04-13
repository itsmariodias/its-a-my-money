import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Svg, Circle, G } from 'react-native-svg';

import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import {
  PeriodSelector,
  getDateRange,
  shortPeriodLabel,
  periodNavLabel,
} from '@/shared/components/PeriodSelector';
import { useAccountsDb, useTransactionsDb, useTransfersDb } from '@/db';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useUIStore } from '@/shared/store/useUIStore';
import { formatAmount } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';

const PIE_COLORS = [
  '#F44336', '#2196F3', '#9C27B0', '#FF9800', '#009688',
  '#607D8B', '#795548', '#9E9E9E', '#4CAF50', '#03A9F4',
];

// Donut chart geometry
const OUTER_R = 105;
const INNER_R = 68;
const STROKE_R = (OUTER_R + INNER_R) / 2;   // 86.5 — center of the stroke ring
const STROKE_W = OUTER_R - INNER_R;          // 37  — ring thickness
const CIRC = 2 * Math.PI * STROKE_R;         // full circumference
const CHART_SIZE = OUTER_R * 2 + 4;          // 214px canvas (2px breathing room each side)

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutSliceProps {
  fraction: number;       // 0–1 share of the total
  cumulativeStart: number; // sum of fractions before this slice
  color: string;
  resetKey: string;       // changes when the dataset changes → re-triggers animation
  index: number;          // stagger index
}

function DonutSlice({ fraction, cumulativeStart, color, resetKey, index }: DonutSliceProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    // Each slice starts 40 ms after the previous one so they stagger slightly
    progress.value = withDelay(
      index * 40,
      withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const arcLength = fraction * CIRC;

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${progress.value * arcLength} ${CIRC}`,
    strokeDashoffset: -(cumulativeStart * CIRC),
  }));

  return (
    <AnimatedCircle
      cx={CHART_SIZE / 2}
      cy={CHART_SIZE / 2}
      r={STROKE_R}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_W}
      animatedProps={animatedProps}
    />
  );
}

export default function DashboardScreen() {
  const { isDark, accentColor, onAccentColor, bg, cardBg, textColor, subColor: subTextColor, borderColor } = useAppTheme();

  const selectedId = useUIStore((s) => s.selectedAccountId);
  const periodMode = useUIStore((s) => s.periodMode);
  const periodDate = useUIStore((s) => s.periodDate);
  const setPeriod = useUIStore((s) => s.setPeriod);
  const [selectedSliceIdx, setSelectedSliceIdx] = useState<number | null>(null);

  const transactionsDb = useTransactionsDb();
  const accountsDb = useAccountsDb();
  const transfersDb = useTransfersDb();
  const accounts = useAccountsStore((s) => s.accounts);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const setTransfers = useTransfersStore((s) => s.setTransfers);
  const currency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        transactionsDb.getAll(),
        accountsDb.getAll(),
        transfersDb.getAll(),
      ]).then(([all, accs, tfrs]) => {
        setTransactions(all);
        setAccounts(accs);
        setTransfers(tfrs);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const dateRange = useMemo(() => getDateRange(periodMode, periodDate), [periodMode, periodDate]);

  // Balance at end of the selected period (cumulative)
  const totalBalance = useMemo(() => {
    const txUpToEnd = transactions.filter(
      (t) => t.date <= dateRange.end && (selectedId === null || t.account_id === selectedId)
    );
    const txNet = txUpToEnd.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const base = selectedId !== null
      ? (accounts.find((a) => a.id === selectedId)?.initial_balance ?? 0)
      : accounts.reduce((s, a) => s + a.initial_balance, 0);
    // Transfers net to 0 across all accounts; only apply for single-account view
    const transferNet = selectedId !== null
      ? transfers
          .filter((t) => t.date <= dateRange.end)
          .reduce((sum, t) => {
            if (t.from_account_id === selectedId) return sum - t.amount;
            if (t.to_account_id === selectedId) return sum + t.amount;
            return sum;
          }, 0)
      : 0;
    return base + txNet + transferNet;
  }, [accounts, transactions, transfers, selectedId, dateRange]);

  // Transactions within the selected period (for income/expenses/pie/recent)
  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.date >= dateRange.start &&
          t.date <= dateRange.end &&
          (selectedId === null || t.account_id === selectedId)
      ),
    [transactions, selectedId, dateRange]
  );

  const recentItems = useMemo(() => {
    type RecentItem =
      | { kind: 'tx'; item: typeof periodTransactions[0] }
      | { kind: 'transfer'; item: typeof transfers[0] };
    const txItems: RecentItem[] = periodTransactions.map((item) => ({ kind: 'tx', item }));
    if (selectedId === null) return txItems.slice(0, 5);
    const transferItems: RecentItem[] = transfers
      .filter(
        (t) =>
          t.date >= dateRange.start &&
          t.date <= dateRange.end &&
          (t.from_account_id === selectedId || t.to_account_id === selectedId)
      )
      .map((item) => ({ kind: 'transfer' as const, item }));
    return [...txItems, ...transferItems]
      .sort((a, b) => {
        if (b.item.date !== a.item.date) return b.item.date.localeCompare(a.item.date);
        return b.item.created_at.localeCompare(a.item.created_at);
      })
      .slice(0, 5);
  }, [periodTransactions, transfers, selectedId, dateRange]);

  const periodIncome = useMemo(
    () => periodTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [periodTransactions]
  );

  const periodExpenses = useMemo(
    () => periodTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [periodTransactions]
  );

  const pieData = useMemo(() => {
    const grouped: Record<string, { amount: number; color: string; icon: string }> = {};
    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (!grouped[t.category_name]) {
          grouped[t.category_name] = { amount: 0, color: t.category_color, icon: t.category_icon };
        }
        grouped[t.category_name].amount += t.amount;
      });
    return Object.entries(grouped)
      .map(([label, { amount, color, icon }], i) => ({
        value: amount,
        color: color || PIE_COLORS[i % PIE_COLORS.length],
        label,
        icon,
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // Stable key that changes whenever the category set changes — drives slice re-animation
  const pieResetKey = useMemo(() => pieData.map((d) => d.label).join('|'), [pieData]);

  // Reset selected slice when period/data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setSelectedSliceIdx(null); }, [pieData]);

  // Dim non-selected slices; selected slice stays full opacity
  const pieDataWithFocus = useMemo(() => {
    return pieData.map((item, i) => {
      const isOther = selectedSliceIdx !== null && selectedSliceIdx !== i;
      return {
        ...item,
        color: isOther ? item.color + '55' : item.color,
      };
    });
  }, [pieData, selectedSliceIdx]);

  const selectSlice = useCallback((idx: number | null) => {
    setSelectedSliceIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const handleChartPress = useCallback((x: number, y: number) => {
    const dx = x - CHART_SIZE / 2;
    const dy = y - CHART_SIZE / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Only hits within the donut ring count
    if (dist < INNER_R || dist > OUTER_R) {
      selectSlice(null);
      return;
    }
    // Angle from 12 o'clock, clockwise, 0–360°
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
    let cumulative = 0;
    for (let i = 0; i < pieData.length; i++) {
      const sliceDeg = (pieData[i].value / periodExpenses) * 360;
      if (angle < cumulative + sliceDeg) { selectSlice(i); return; }
      cumulative += sliceDeg;
    }
    selectSlice(null);
  }, [pieData, periodExpenses, selectSlice]);

  const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null;
  const periodShort = shortPeriodLabel(periodMode, periodDate);


  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Period selector */}
      <View style={[styles.periodBar, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <PeriodSelector
          mode={periodMode}
          date={periodDate}
          onChange={setPeriod}
        />
      </View>

      <ScrollView
        style={[styles.scroll, { zIndex: 1 }]}
        contentContainerStyle={[styles.content, { backgroundColor: bg }]}

      >
        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: accentColor }]}>
          <Text style={[styles.balanceLabel, { color: onAccentColor + 'CC' }]}>
            {selectedAccount ? `${selectedAccount.name} Balance` : 'Total Balance'}
          </Text>
          <Text style={[styles.balanceAmount, { color: onAccentColor }]}>{formatAmount(totalBalance, currency, undefined, numberFormat)}</Text>
          <Text style={[styles.balanceSub, { color: onAccentColor + 'A6' }]}>as of {periodNavLabel(periodMode, periodDate)}</Text>
        </View>

        {/* Income / Expense Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
            <MaterialIcons name="arrow-downward" size={20} color="#4CAF50" />
            <Text style={[styles.summaryLabel, { color: subTextColor }]}>Income</Text>
            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>{formatAmount(periodIncome, currency, undefined, numberFormat)}</Text>
            <Text style={[styles.summaryPeriod, { color: subTextColor }]}>{periodShort}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
            <MaterialIcons name="arrow-upward" size={20} color="#F44336" />
            <Text style={[styles.summaryLabel, { color: subTextColor }]}>Expenses</Text>
            <Text style={[styles.summaryAmount, { color: '#F44336' }]}>{formatAmount(periodExpenses, currency, undefined, numberFormat)}</Text>
            <Text style={[styles.summaryPeriod, { color: subTextColor }]}>{periodShort}</Text>
          </View>
        </View>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <View style={[styles.section, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Spending by Category</Text>

            <View style={styles.pieContainer}>
              <Pressable onPress={(e) => handleChartPress(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
                <View style={{ width: CHART_SIZE, height: CHART_SIZE }}>
                  <Svg width={CHART_SIZE} height={CHART_SIZE}>
                    {/* Rotate -90° so arcs start drawing from 12 o'clock */}
                    <G rotation={-90} originX={CHART_SIZE / 2} originY={CHART_SIZE / 2}>
                      {/* Background ring so the donut hole is the card color */}
                      <Circle
                        cx={CHART_SIZE / 2}
                        cy={CHART_SIZE / 2}
                        r={STROKE_R}
                        fill="none"
                        stroke={cardBg}
                        strokeWidth={STROKE_W + 2}
                      />
                      {pieDataWithFocus.map((item, i) => {
                        const fraction = item.value / periodExpenses;
                        const cumulativeStart = pieDataWithFocus
                          .slice(0, i)
                          .reduce((s, d) => s + d.value / periodExpenses, 0);
                        return (
                          <DonutSlice
                            key={item.label}
                            fraction={fraction}
                            cumulativeStart={cumulativeStart}
                            color={item.color}
                            resetKey={pieResetKey}
                            index={i}
                          />
                        );
                      })}
                    </G>
                  </Svg>

                  {/* Center label — absolutely overlaid in the hole */}
                  <View style={[StyleSheet.absoluteFill, styles.pieCenterOverlay]} pointerEvents="none">
                    <View style={styles.pieCenter}>
                      {selectedSliceIdx !== null ? (() => {
                        const slice = pieData[selectedSliceIdx];
                        const pct = Math.round((slice.value / periodExpenses) * 100);
                        return (
                          <>
                            <Text style={[styles.pieCenterCategory, { color: subTextColor }]} numberOfLines={2}>
                              {slice.label}
                            </Text>
                            <Text style={[styles.pieCenterAmount, { color: textColor }]}>
                              {formatAmount(slice.value, currency, undefined, numberFormat)}
                            </Text>
                            <Text style={[styles.pieCenterPct, { color: slice.color }]}>{pct}%</Text>
                          </>
                        );
                      })() : (
                        <>
                          <Text style={[styles.pieCenterTotal, { color: textColor }]}>
                            {formatAmount(periodExpenses, currency, undefined, numberFormat)}
                          </Text>
                          <Text style={[styles.pieCenterLabel, { color: subTextColor }]}>total spent</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Legend */}
            <ScrollView style={styles.legend} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {pieData.map((item, idx) => {
                const pct = Math.round((item.value / periodExpenses) * 100);
                const isSelected = selectedSliceIdx === idx;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.legendRow,
                      isSelected && { backgroundColor: item.color + '18', borderRadius: 10 },
                    ]}
                    onPress={() => selectSlice(idx)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}, ${formatAmount(item.value, currency, undefined, numberFormat)}, ${pct}%`}
                  >
                    <View style={[styles.legendDot, { backgroundColor: item.color }]}>
                      <MaterialIcons name={(item.icon as any) || 'label'} size={12} color="#fff" />
                    </View>
                    <Text
                      style={[styles.legendLabel, { color: isSelected ? textColor : subTextColor, fontWeight: isSelected ? '600' : '400' }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    <Text style={[styles.legendPct, { color: item.color }]}>{pct}%</Text>
                    <Text style={[styles.legendAmount, { color: textColor, fontWeight: isSelected ? '700' : '500' }]}>
                      {formatAmount(item.value, currency, undefined, numberFormat)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 0 }]}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')} accessibilityRole="link" accessibilityLabel="See all transactions">
              <Text style={[styles.seeAll, { color: accentColor }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: subTextColor }]}>No transactions for this period</Text>
          ) : (
            recentItems.map((listItem) => {
              if (listItem.kind === 'transfer') {
                const t = listItem.item;
                const isOutgoing = t.from_account_id === selectedId;
                const otherName = (isOutgoing ? t.to_account_name : t.from_account_name) ?? 'Unknown';
                const amountColor = isOutgoing ? '#F44336' : '#4CAF50';
                const amountType = isOutgoing ? 'expense' : 'income';
                return (
                  <View key={`transfer-${t.id}`} style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: '#9E9E9E' }]}>
                      <MaterialIcons name="swap-horiz" size={18} color="#fff" />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txName, { color: textColor }]}>
                        {isOutgoing ? `To ${otherName}` : `From ${otherName}`}
                      </Text>
                      <Text style={[styles.txDate, { color: subTextColor }]}>{t.date}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: amountColor }]}>
                      {formatAmount(t.amount, currency, amountType, numberFormat)}
                    </Text>
                  </View>
                );
              }
              const tx = listItem.item;
              return (
                <View key={`tx-${tx.id}`} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: tx.category_color || '#9E9E9E' }]}>
                    <MaterialIcons
                      name={(tx.category_icon as any) || 'attach-money'}
                      size={18}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txName, { color: textColor }]}>{tx.category_name}</Text>
                    <Text style={[styles.txDate, { color: subTextColor }]}>{tx.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'income' ? '#4CAF50' : '#F44336' },
                    ]}
                  >
                    {formatAmount(tx.amount, currency, tx.type, numberFormat)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },

  periodBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  balanceCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  balanceSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },

  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: { fontSize: 12 },
  summaryAmount: { fontSize: 18, fontWeight: '700' },
  summaryPeriod: { fontSize: 11 },

  section: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '500' },

  pieContainer: { alignItems: 'center', marginVertical: 4 },
  pieCenterOverlay: { alignItems: 'center', justifyContent: 'center' },
  pieCenter: { alignItems: 'center', paddingHorizontal: 8 },
  pieCenterTotal: { fontSize: 18, fontWeight: '700' },
  pieCenterAmount: { fontSize: 16, fontWeight: '700' },
  pieCenterLabel: { fontSize: 11, marginTop: 2 },
  pieCenterCategory: { fontSize: 11, textAlign: 'center', marginBottom: 2 },
  pieCenterPct: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  legend: { maxHeight: 168, marginTop: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  legendDot: { width: 22, height: 22, borderRadius: 11, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  legendLabel: { flex: 1, fontSize: 13 },
  legendPct: { fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },
  legendAmount: { fontSize: 13, width: 80, textAlign: 'right' },

  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
});
