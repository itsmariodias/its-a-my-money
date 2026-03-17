import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import AccountFormSheet from '@/components/AccountFormSheet';
import {
  PeriodSelector,
  getDateRange,
  periodNavLabel,
  type PeriodMode,
} from '@/components/PeriodSelector';
import { useAccountsDb, useTransactionsDb } from '@/db';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { getColors } from '@/constants/theme';
import type { Account } from '@/types';

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteModalProps {
  account: Account | null;
  txCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ account, txCount, onCancel, onConfirm }: DeleteModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { cardBg, textColor, subColor, borderColor } = getColors(isDark);

  return (
    <Modal
      visible={account !== null}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={dlStyles.backdrop} onPress={onCancel}>
        <Pressable style={[dlStyles.card, { backgroundColor: cardBg }]} onPress={() => {}}>
          {/* Red trash circle */}
          <View style={dlStyles.iconCircle}>
            <MaterialIcons name="delete-forever" size={30} color="#fff" />
          </View>

          {/* Title */}
          <Text style={[dlStyles.title, { color: textColor }]}>Delete Account?</Text>

          {/* Account chip */}
          {account && (
            <View style={[dlStyles.accountChip, { backgroundColor: isDark ? '#0f3460' : '#f0f4f8', borderColor }]}>
              <View style={[dlStyles.chipDot, { backgroundColor: account.color ?? '#55A3FF' }]}>
                <MaterialIcons
                  name={(account.icon as any) ?? 'account-balance-wallet'}
                  size={14}
                  color="#fff"
                />
              </View>
              <Text style={[dlStyles.chipName, { color: textColor }]} numberOfLines={1}>
                {account.name}
              </Text>
            </View>
          )}

          {/* Message */}
          <Text style={[dlStyles.message, { color: subColor }]}>
            {txCount > 0
              ? `This will also permanently delete ${txCount} transaction${txCount !== 1 ? 's' : ''} linked to this account.`
              : 'This account has no transactions and will be permanently removed.'}
          </Text>

          {/* Warning */}
          <View style={dlStyles.warningRow}>
            <MaterialIcons name="warning-amber" size={14} color="#f59e0b" />
            <Text style={dlStyles.warningText}>This action cannot be undone.</Text>
          </View>

          {/* Buttons */}
          <View style={[dlStyles.divider, { backgroundColor: borderColor }]} />
          <View style={dlStyles.buttons}>
            <TouchableOpacity
              style={[dlStyles.btn, dlStyles.cancelBtn, { borderColor }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[dlStyles.btnText, { color: textColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dlStyles.btn, dlStyles.deleteBtn]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete" size={16} color="#fff" />
              <Text style={[dlStyles.btnText, { color: '#fff' }]}>Delete</Text>
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
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    maxWidth: '100%',
  },
  chipDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
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
  deleteBtn: {
    // no extra style needed
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

// ─── SwipeableAccountCard ────────────────────────────────────────────────────

const REVEAL_WIDTH = 80;

interface CardProps {
  account: Account;
  balance: number;
  currency: string;
  isOnlyAccount: boolean;
  resetSignal: number;
  onPress: () => void;
  onDeletePress: () => void;
  isDark: boolean;
}

function SwipeableAccountCard({
  account,
  balance,
  currency,
  isOnlyAccount,
  resetSignal,
  onPress,
  onDeletePress,
  isDark,
}: CardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  // Tracks the resting position (0 = closed, -REVEAL_WIDTH = open)
  const offsetX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      // Capture horizontal swipes; allow left-swipe to open OR right-swipe to close
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (Math.abs(dy) > Math.abs(dx)) return false;
        if (Math.abs(dx) < 5) return false;
        return dx < 0 || offsetX.current < 0;
      },
      onPanResponderMove: (_, { dx }) => {
        // Position = current resting offset + gesture delta, clamped to valid range
        translateX.setValue(Math.max(-REVEAL_WIDTH, Math.min(0, offsetX.current + dx)));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const projected = offsetX.current + dx;
        let toValue: number;
        if (vx < -0.4) toValue = -REVEAL_WIDTH;       // fast left flick → open
        else if (vx > 0.4) toValue = 0;               // fast right flick → close
        else toValue = projected < -(REVEAL_WIDTH / 2) ? -REVEAL_WIDTH : 0;
        offsetX.current = toValue;
        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      },
      onPanResponderTerminate: () => {
        offsetX.current = 0;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Reset card position when the signal fires (tab switch or delete cancel)
  useEffect(() => {
    offsetX.current = 0;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const { cardBg, textColor, subColor } = getColors(isDark);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const iconBg = account.color ?? '#55A3FF';
  const balanceColor = balance >= 0 ? '#22c55e' : '#ef4444';

  return (
    <View style={styles.swipeableWrapper}>
      {/* Delete zone behind the card */}
      <View style={styles.deleteZone}>
        <TouchableOpacity
          style={[styles.deleteBtn, isOnlyAccount && { opacity: 0.3 }]}
          onPress={onDeletePress}
          disabled={isOnlyAccount}
        >
          <MaterialIcons name="delete" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sliding card */}
      <Animated.View
        style={[styles.card, { backgroundColor: cardBg, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.cardInner} onPress={onPress} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <MaterialIcons
              name={(account.icon as any) ?? 'account-balance-wallet'}
              size={22}
              color="#fff"
            />
          </View>

          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: textColor }]} numberOfLines={1}>
              {account.name}
            </Text>
            <Text style={[styles.cardCurrency, { color: subColor }]}>{account.currency}</Text>
          </View>

          <Text style={[styles.cardBalance, { color: balanceColor }]}>
            {formatAmount(balance, currency, undefined, numberFormat)}
          </Text>

          <MaterialIcons name="chevron-right" size={20} color={subColor} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── AccountsScreen ──────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [periodDate, setPeriodDate] = useState(new Date());
  const [resetSignal, setResetSignal] = useState(0);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleteTxCount, setDeleteTxCount] = useState(0);

  const accounts = useAccountsStore((s) => s.accounts);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);

  const accountsDb = useAccountsDb();
  const transactionsDb = useTransactionsDb();
  const currency = useSettingsStore((s) => s.currency);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  useFocusEffect(
    useCallback(() => {
      Promise.all([accountsDb.getAll(), transactionsDb.getAll()]).then(([accs, txns]) => {
        setAccounts(accs);
        setTransactions(txns);
      });
      // Reset all card swipes when leaving the tab
      return () => setResetSignal((s) => s + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const dateRange = useMemo(() => getDateRange(periodMode, periodDate), [periodMode, periodDate]);

  const balanceMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const acc of accounts) {
      const net = transactions
        .filter((t) => t.account_id === acc.id && t.date <= dateRange.end)
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
      map[acc.id] = acc.initial_balance + net;
    }
    return map;
  }, [accounts, transactions, dateRange]);

  const totalBalance = useMemo(
    () => Object.values(balanceMap).reduce((s, v) => s + v, 0),
    [balanceMap]
  );

  const handleDeletePress = useCallback(
    (account: Account) => {
      if (accounts.length <= 1) return;
      setDeleteTxCount(transactions.filter((t) => t.account_id === account.id).length);
      setDeletingAccount(account);
    },
    [accounts, transactions]
  );

  const handleDeleteCancel = useCallback(() => {
    setDeletingAccount(null);
    setResetSignal((s) => s + 1); // snap the swiped card back
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingAccount) return;
    const account = deletingAccount;
    setDeletingAccount(null);
    await transactionsDb.removeByAccount(account.id);
    await accountsDb.remove(account.id);
    const [accs, txns] = await Promise.all([accountsDb.getAll(), transactionsDb.getAll()]);
    setAccounts(accs);
    setTransactions(txns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingAccount]);

  const { bg, subColor, borderColor } = getColors(isDark);

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total balance card */}
        <View style={[styles.totalCard, { backgroundColor: accentColor }]}>
          <Text style={styles.totalLabel}>Total Balance</Text>
          <Text style={styles.totalAmount}>
            {formatAmount(totalBalance, currency, undefined, numberFormat)}
          </Text>
          <Text style={styles.totalSub}>
            as of {periodNavLabel(periodMode, periodDate)} · {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {accounts.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="account-balance-wallet" size={48} color={subColor} />
            <Text style={[styles.emptyText, { color: subColor }]}>No accounts yet</Text>
          </View>
        ) : (
          accounts.map((acc) => (
            <SwipeableAccountCard
              key={acc.id}
              account={acc}
              balance={balanceMap[acc.id] ?? acc.initial_balance}
              currency={currency}
              isOnlyAccount={accounts.length <= 1}
              resetSignal={resetSignal}
              isDark={isDark}
              onPress={() => {
                setEditingAccount(acc);
                setFormOpen(true);
              }}
              onDeletePress={() => handleDeletePress(acc)}
            />
          ))
        )}

        <TouchableOpacity
          style={[styles.newAccountBtn, { borderColor }]}
          onPress={() => { setEditingAccount(null); setFormOpen(true); }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={20} color={accentColor} />
          <Text style={[styles.newAccountBtnText, { color: accentColor }]}>New Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <AccountFormSheet
        isOpen={formOpen}
        account={editingAccount}
        onClose={() => setFormOpen(false)}
      />

      <DeleteConfirmModal
        account={deletingAccount}
        txCount={deleteTxCount}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  periodBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  newAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
  },
  newAccountBtnText: {
    color: '#2f95dc', // overridden inline with accentColor
    fontWeight: '600',
    fontSize: 15,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },
  totalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 4,
  },
  totalSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  swipeableWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
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
    // No borderRadius here — the wrapper's overflow:hidden clips the outer corners.
    // The card's right edge must stay square so it aligns with the delete zone.
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardCurrency: {
    fontSize: 12,
  },
  cardBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
