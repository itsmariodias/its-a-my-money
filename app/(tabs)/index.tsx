import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { router, useFocusEffect, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { Text } from '@/components/Themed';
import {
  PeriodSelector,
  getDateRange,
  shortPeriodLabel,
  periodNavLabel,
  type PeriodMode,
} from '@/components/PeriodSelector';
import { useAccountsDb, useTransactionsDb } from '@/db';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { getColors } from '@/constants/theme';

const PIE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];


export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [periodDate, setPeriodDate] = useState(new Date());
  const [selectedSliceIdx, setSelectedSliceIdx] = useState<number | null>(null);
  const centerFade = useRef(new Animated.Value(1)).current;

  const transactionsDb = useTransactionsDb();
  const accountsDb = useAccountsDb();
  const accounts = useAccountsStore((s) => s.accounts);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const currency = useSettingsStore((s) => s.currency);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        transactionsDb.getAll(),
        accountsDb.getAll(),
      ]).then(([all, accs]) => {
        setTransactions(all);
        setAccounts(accs);
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
    const net = txUpToEnd.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const base = selectedId !== null
      ? (accounts.find((a) => a.id === selectedId)?.initial_balance ?? 0)
      : accounts.reduce((s, a) => s + a.initial_balance, 0);
    return base + net;
  }, [accounts, transactions, selectedId, dateRange]);

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

  const recentTransactions = useMemo(() => periodTransactions.slice(0, 5), [periodTransactions]);

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
    Animated.sequence([
      Animated.timing(centerFade, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(centerFade, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setSelectedSliceIdx((prev) => (prev === idx ? null : idx));
  }, [centerFade]);

  const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null;
  const periodShort = shortPeriodLabel(periodMode, periodDate);

  const { bg, cardBg, textColor, subColor: subTextColor, borderColor } = getColors(isDark);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerAccountBtn}
          onPress={() => setDropdownOpen((v) => !v)}
          activeOpacity={0.7}
        >
          {selectedAccount ? (
            <View style={[styles.dropdownIcon, { backgroundColor: selectedAccount.color ?? '#55A3FF' }]}>
              <MaterialIcons name={(selectedAccount.icon as any) ?? 'account-balance-wallet'} size={12} color="#fff" />
            </View>
          ) : (
            <MaterialIcons name="layers" size={16} color={accentColor} />
          )}
          <Text style={[styles.headerAccountLabel, { color: textColor }]} numberOfLines={1}>
            {selectedAccount ? selectedAccount.name : 'All'}
          </Text>
          <MaterialIcons name="expand-more" size={16} color={subTextColor} />
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, textColor, subTextColor, accentColor]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Period selector bar */}
      <View style={[styles.periodBar, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <PeriodSelector
          mode={periodMode}
          date={periodDate}
          onChange={(m, d) => { setPeriodMode(m); setPeriodDate(d); }}
        />
      </View>

      {/* Dropdown overlay */}
      {dropdownOpen && (
        <>
          <Pressable
            style={[StyleSheet.absoluteFill, { zIndex: 40 }]}
            onPress={() => setDropdownOpen(false)}
          />
          <View style={[styles.dropdown, { backgroundColor: cardBg, borderColor, zIndex: 50 }]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setSelectedId(null); setDropdownOpen(false); }}
            >
              <MaterialIcons name="layers" size={18} color={accentColor} />
              <Text style={[styles.dropdownItemText, { color: selectedId === null ? accentColor : textColor }]}>
                All Accounts
              </Text>
              {selectedId === null && <MaterialIcons name="check" size={18} color={accentColor} />}
            </TouchableOpacity>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={styles.dropdownItem}
                onPress={() => { setSelectedId(acc.id); setDropdownOpen(false); }}
              >
                <View style={[styles.dropdownIcon, { backgroundColor: acc.color ?? '#55A3FF' }]}>
                  <MaterialIcons name={(acc.icon as any) ?? 'account-balance-wallet'} size={13} color="#fff" />
                </View>
                <Text
                  style={[styles.dropdownItemText, { color: selectedId === acc.id ? accentColor : textColor }]}
                  numberOfLines={1}
                >
                  {acc.name}
                </Text>
                {selectedId === acc.id && <MaterialIcons name="check" size={18} color={accentColor} />}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <ScrollView
        style={[styles.scroll, { zIndex: 1 }]}
        contentContainerStyle={[styles.content, { backgroundColor: bg }]}
      >
        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: accentColor }]}>
          <Text style={styles.balanceLabel}>
            {selectedAccount ? `${selectedAccount.name} Balance` : 'Total Balance'}
          </Text>
          <Text style={styles.balanceAmount}>{formatAmount(totalBalance, currency, undefined, numberFormat)}</Text>
          <Text style={styles.balanceSub}>as of {periodNavLabel(periodMode, periodDate)}</Text>
        </View>

        {/* Income / Expense Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
            <MaterialIcons name="arrow-downward" size={20} color="#22c55e" />
            <Text style={[styles.summaryLabel, { color: subTextColor }]}>Income</Text>
            <Text style={[styles.summaryAmount, { color: '#22c55e' }]}>{formatAmount(periodIncome, currency, undefined, numberFormat)}</Text>
            <Text style={[styles.summaryPeriod, { color: subTextColor }]}>{periodShort}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
            <MaterialIcons name="arrow-upward" size={20} color="#ef4444" />
            <Text style={[styles.summaryLabel, { color: subTextColor }]}>Expenses</Text>
            <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>{formatAmount(periodExpenses, currency, undefined, numberFormat)}</Text>
            <Text style={[styles.summaryPeriod, { color: subTextColor }]}>{periodShort}</Text>
          </View>
        </View>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <View style={[styles.section, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Spending by Category</Text>

            <View style={styles.pieContainer}>
              <PieChart
                data={pieDataWithFocus}
                donut
                radius={105}
                innerRadius={68}
                backgroundColor={cardBg}
                onPress={(_item: any, index: number) => selectSlice(index)}
                centerLabelComponent={() => {
                  const slice = selectedSliceIdx !== null ? pieData[selectedSliceIdx] : null;
                  const pct = slice ? Math.round((slice.value / periodExpenses) * 100) : null;
                  return (
                    <Animated.View style={[styles.pieCenter, { opacity: centerFade }]}>
                      {slice ? (
                        <>
                          <Text style={[styles.pieCenterCategory, { color: subTextColor }]} numberOfLines={2}>
                            {slice.label}
                          </Text>
                          <Text style={[styles.pieCenterAmount, { color: textColor }]}>
                            {formatAmount(slice.value, currency, undefined, numberFormat)}
                          </Text>
                          <Text style={[styles.pieCenterPct, { color: slice.color }]}>{pct}%</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.pieCenterTotal, { color: textColor }]}>
                            {formatAmount(periodExpenses, currency, undefined, numberFormat)}
                          </Text>
                          <Text style={[styles.pieCenterLabel, { color: subTextColor }]}>total spent</Text>
                        </>
                      )}
                    </Animated.View>
                  );
                }}
              />
            </View>

            {/* Legend */}
            <View style={styles.legend}>
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
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 0 }]}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={[styles.seeAll, { color: accentColor }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: subTextColor }]}>No transactions for this period</Text>
          ) : (
            recentTransactions.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: tx.category_color || '#6b7280' }]}>
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
                    { color: tx.type === 'income' ? '#22c55e' : '#ef4444' },
                  ]}
                >
                  {formatAmount(tx.amount, currency, tx.type, numberFormat)}
                </Text>
              </View>
            ))
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
  headerAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 16,
  },
  headerAccountLabel: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 90,
  },
  dropdownIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 0,
    right: 8,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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
  pieCenter: { alignItems: 'center', paddingHorizontal: 8 },
  pieCenterTotal: { fontSize: 18, fontWeight: '700' },
  pieCenterAmount: { fontSize: 16, fontWeight: '700' },
  pieCenterLabel: { fontSize: 11, marginTop: 2 },
  pieCenterCategory: { fontSize: 11, textAlign: 'center', marginBottom: 2 },
  pieCenterPct: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  legend: { gap: 2, marginTop: 8 },
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
