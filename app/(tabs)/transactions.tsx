import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import AddTransactionSheet from '@/components/AddTransactionSheet';
import {
  PeriodSelector,
  getDateRange,
  type PeriodMode,
} from '@/components/PeriodSelector';
import { useAccountsDb, useTransactionsDb } from '@/db';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { getColors } from '@/constants/theme';
import type { TransactionWithDetails } from '@/types';


function formatDateHeader(d: string): string {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (d === todayStr) return 'Today';
  if (d === yesterdayStr) return 'Yesterday';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── DeleteTxModal ─────────────────────────────────────────────────────────

interface DeleteTxModalProps {
  tx: TransactionWithDetails | null;
  currency: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteTxModal({ tx, currency, onCancel, onConfirm }: DeleteTxModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { cardBg, inputBg, textColor, subColor, borderColor } = getColors(isDark);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  return (
    <Modal visible={tx !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={dlStyles.backdrop} onPress={onCancel}>
        <Pressable style={[dlStyles.card, { backgroundColor: cardBg }]} onPress={() => {}}>
          {/* Icon */}
          <View style={dlStyles.iconCircle}>
            <MaterialIcons name="delete-forever" size={30} color="#fff" />
          </View>

          <Text style={[dlStyles.title, { color: textColor }]}>Delete Transaction?</Text>

          {/* Transaction chip */}
          {tx && (
            <View style={[dlStyles.txChip, { backgroundColor: inputBg, borderColor }]}>
              <View style={[dlStyles.chipIcon, { backgroundColor: tx.category_color || '#6b7280' }]}>
                <MaterialIcons name={(tx.category_icon as any) || 'attach-money'} size={14} color="#fff" />
              </View>
              <View style={dlStyles.chipInfo}>
                <Text style={[dlStyles.chipName, { color: textColor }]} numberOfLines={1}>
                  {tx.category_name}
                </Text>
                <Text style={[dlStyles.chipSub, { color: subColor }]} numberOfLines={1}>
                  {tx.account_name} · {tx.date}
                </Text>
              </View>
              <Text style={[dlStyles.chipAmount, { color: tx.type === 'income' ? '#22c55e' : '#ef4444' }]}>
                {formatAmount(tx.amount, currency, tx.type, numberFormat)}
              </Text>
            </View>
          )}

          <Text style={[dlStyles.message, { color: subColor }]}>
            This transaction will be permanently removed from your records.
          </Text>

          <View style={dlStyles.warningRow}>
            <MaterialIcons name="warning-amber" size={14} color="#f59e0b" />
            <Text style={dlStyles.warningText}>This action cannot be undone.</Text>
          </View>

          <View style={[dlStyles.divider, { backgroundColor: borderColor }]} />
          <View style={dlStyles.buttons}>
            <TouchableOpacity
              style={[dlStyles.btn, dlStyles.cancelBtn, { borderColor }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[dlStyles.btnText, { color: textColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dlStyles.btn} onPress={onConfirm} activeOpacity={0.7}>
              <MaterialIcons name="delete" size={16} color="#ef4444" />
              <Text style={[dlStyles.btnText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dlStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 0,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  txChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    width: '100%',
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInfo: {
    flex: 1,
    gap: 2,
  },
  chipName: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipSub: {
    fontSize: 11,
  },
  chipAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  divider: {
    width: '120%',
    height: StyleSheet.hairlineWidth,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  cancelBtn: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

// ─── SwipeableTransactionRow ──────────────────────────────────────────────────

const REVEAL_WIDTH = 80;

interface RowProps {
  tx: TransactionWithDetails;
  isFirst: boolean;
  isLast: boolean;
  resetSignal: number;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textColor: string;
  subTextColor: string;
  currency: string;
  onPress: () => void;
  onDeletePress: () => void;
}

function SwipeableTransactionRow({
  tx,
  isFirst,
  isLast,
  resetSignal,
  isDark,
  cardBg,
  borderColor,
  textColor,
  subTextColor,
  currency,
  onPress,
  onDeletePress,
}: RowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (Math.abs(dy) > Math.abs(dx)) return false;
        if (Math.abs(dx) < 5) return false;
        return dx < 0 || offsetX.current < 0;
      },
      onPanResponderMove: (_, { dx }) => {
        translateX.setValue(Math.max(-REVEAL_WIDTH, Math.min(0, offsetX.current + dx)));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const projected = offsetX.current + dx;
        let toValue: number;
        if (vx < -0.4) toValue = -REVEAL_WIDTH;
        else if (vx > 0.4) toValue = 0;
        else toValue = projected < -(REVEAL_WIDTH / 2) ? -REVEAL_WIDTH : 0;
        offsetX.current = toValue;
        Animated.spring(translateX, { toValue, useNativeDriver: true, tension: 80, friction: 10 }).start();
      },
      onPanResponderTerminate: () => {
        offsetX.current = 0;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  useEffect(() => {
    offsetX.current = 0;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const amountColor = tx.type === 'income' ? '#22c55e' : '#ef4444';

  return (
    <View
      style={[
        rowStyles.wrapper,
        isFirst && rowStyles.wrapperFirst,
        isLast && rowStyles.wrapperLast,
      ]}
    >
      {/* Delete zone */}
      <View style={rowStyles.deleteZone}>
        <TouchableOpacity style={rowStyles.deleteBtn} onPress={onDeletePress}>
          <MaterialIcons name="delete" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sliding card */}
      <Animated.View
        style={[rowStyles.card, { backgroundColor: cardBg, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            rowStyles.row,
            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
          ]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={[rowStyles.icon, { backgroundColor: tx.category_color || '#6b7280' }]}>
            <MaterialIcons name={(tx.category_icon as any) || 'attach-money'} size={18} color="#fff" />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.category, { color: textColor }]}>{tx.category_name}</Text>
            <Text style={[rowStyles.sub, { color: subTextColor }]} numberOfLines={1}>
              {[tx.account_name, tx.note].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={[rowStyles.amount, { color: amountColor }]}>
            {formatAmount(tx.amount, currency, tx.type, numberFormat)}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  wrapperFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  wrapperLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: REVEAL_WIDTH,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    // no borderRadius — wrapper handles clipping
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  category: { fontSize: 14, fontWeight: '500' },
  sub: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600' },
});

// ─── Section type ─────────────────────────────────────────────────────────────

interface Section {
  title: string;
  date: string;
  net: number;
  data: TransactionWithDetails[];
}

// ─── TransactionsScreen ───────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [periodDate, setPeriodDate] = useState(new Date());
  const [resetSignal, setResetSignal] = useState(0);
  const [editingTx, setEditingTx] = useState<TransactionWithDetails | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionWithDetails | null>(null);

  const transactionsDb = useTransactionsDb();
  const accountsDb = useAccountsDb();
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const accounts = useAccountsStore((s) => s.accounts);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const currency = useSettingsStore((s) => s.currency);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  useFocusEffect(
    useCallback(() => {
      Promise.all([transactionsDb.getAll(), accountsDb.getAll()]).then(([txns, accs]) => {
        setTransactions(txns);
        setAccounts(accs);
      });
      return () => setResetSignal((s) => s + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const dateRange = useMemo(() => getDateRange(periodMode, periodDate), [periodMode, periodDate]);

  const filtered = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.date >= dateRange.start &&
          t.date <= dateRange.end &&
          (selectedId === null || t.account_id === selectedId)
      ),
    [transactions, selectedId, dateRange]
  );

  const sections = useMemo<Section[]>(() => {
    const byDate: Record<string, TransactionWithDetails[]> = {};
    for (const tx of filtered) {
      if (!byDate[tx.date]) byDate[tx.date] = [];
      byDate[tx.date].push(tx);
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({
        title: formatDateHeader(date),
        date,
        net: data.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0),
        data,
      }));
  }, [filtered]);

  const handleDeletePress = useCallback((tx: TransactionWithDetails) => {
    setDeletingTx(tx);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeletingTx(null);
    setResetSignal((s) => s + 1);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingTx) return;
    const id = deletingTx.id;
    setDeletingTx(null);
    await transactionsDb.remove(id);
    const txns = await transactionsDb.getAll();
    setTransactions(txns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingTx]);

  const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null;

  const { bg, cardBg, textColor, subColor: subTextColor, borderColor } = getColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Period + account selector bar */}
      <View style={[styles.periodBar, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <PeriodSelector
          mode={periodMode}
          date={periodDate}
          onChange={(m, d) => { setPeriodMode(m); setPeriodDate(d); }}
        />
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
      </View>

      {/* Account dropdown overlay */}
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

      {/* Content */}
      {filtered.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: bg }]}>
          <MaterialIcons name="receipt-long" size={56} color={subTextColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No transactions</Text>
          <Text style={[styles.emptyHint, { color: subTextColor }]}>
            No transactions found for this period
          </Text>
        </View>
      ) : (
        <SectionList
          style={{ backgroundColor: bg, zIndex: 1 }}
          contentContainerStyle={[styles.listContent, { backgroundColor: bg }]}
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: bg }]}>
              <Text style={[styles.sectionDate, { color: textColor }]}>{section.title}</Text>
              <Text style={[styles.sectionNet, { color: section.net >= 0 ? '#22c55e' : '#ef4444' }]}>
                {formatAmount(section.net, currency, undefined, numberFormat)}
              </Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <SwipeableTransactionRow
              tx={item}
              isFirst={index === 0}
              isLast={index === section.data.length - 1}
              resetSignal={resetSignal}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={textColor}
              subTextColor={subTextColor}
              currency={currency}
              onPress={() => setEditingTx(item)}
              onDeletePress={() => handleDeletePress(item)}
            />
          )}
        />
      )}

      <AddTransactionSheet
        isOpen={editingTx !== null}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
      />

      <DeleteTxModal
        tx={deletingTx}
        currency={currency}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  periodBar: {
    flexDirection: 'row',
    alignItems: 'center',
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

  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyHint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionDate: { fontSize: 14, fontWeight: '600' },
  sectionNet: { fontSize: 13, fontWeight: '600' },
});
