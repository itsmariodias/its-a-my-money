import { useCallback, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-snackbar';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import AccountFormSheet from '@/features/accounts/AccountFormSheet';
import AccountIcon from '@/shared/components/AccountIcon';
import {
  PeriodSelector,
  getDateRange,
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
import type { Account } from '@/types';

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteModalProps {
  account: Account | null;
  txCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ account, txCount, onCancel, onConfirm }: DeleteModalProps) {
  const { isDark, cardBg, inputBg, textColor, subColor, borderColor } = useAppTheme();

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
            <View style={[dlStyles.accountChip, { backgroundColor: inputBg, borderColor }]}>
              <View style={[dlStyles.chipDot, { backgroundColor: account.color ?? '#55A3FF' }]}>
                <AccountIcon name={account.icon ?? 'account-balance-wallet'} size={14} color="#fff" />
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
            <MaterialIcons name="warning-amber" size={14} color="#FFC107" />
            <Text style={dlStyles.warningText}>This action cannot be undone.</Text>
          </View>

          {/* Buttons */}
          <View style={[dlStyles.divider, { backgroundColor: borderColor }]} />
          <View style={dlStyles.buttons}>
            <TouchableOpacity
              style={[dlStyles.btn, dlStyles.cancelBtn, { borderColor }]}
              onPress={onCancel}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[dlStyles.btnText, { color: textColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dlStyles.btn, dlStyles.deleteBtn]}
              onPress={onConfirm}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityHint="Double tap to permanently delete this account and all its transactions"
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
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#F44336',
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
    color: '#FFC107',
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

// ─── AccountCard ─────────────────────────────────────────────────────────────

interface CardProps {
  account: Account;
  balance: number;
  currency: string;
  onPress: () => void;
}

function AccountCard({ account, balance, currency, onPress }: CardProps) {
  const { cardBg, textColor, subColor } = useAppTheme();
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const iconBg = account.color ?? '#55A3FF';
  const balanceColor = balance >= 0 ? '#4CAF50' : '#F44336';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, balance ${formatAmount(balance, currency, undefined, numberFormat)}`}
      accessibilityHint="Double tap to edit"
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <AccountIcon name={account.icon ?? 'account-balance-wallet'} size={22} color="#fff" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: textColor }]} numberOfLines={1}>{account.name}</Text>
      </View>
      <Text style={[styles.cardBalance, { color: balanceColor }]}>
        {formatAmount(balance, currency, undefined, numberFormat)}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={subColor} />
    </TouchableOpacity>
  );
}

// ─── AccountsScreen ──────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const { isDark, accentColor, onAccentColor, bg, subColor, borderColor } = useAppTheme();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const periodMode = useUIStore((s) => s.periodMode);
  const periodDate = useUIStore((s) => s.periodDate);
  const setPeriod = useUIStore((s) => s.setPeriod);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleteTxCount, setDeleteTxCount] = useState(0);

  const accounts = useAccountsStore((s) => s.accounts);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const setTransfers = useTransfersStore((s) => s.setTransfers);

  const accountsDb = useAccountsDb();
  const transactionsDb = useTransactionsDb();
  const transfersDb = useTransfersDb();
  const currency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  useFocusEffect(
    useCallback(() => {
      Promise.all([accountsDb.getAll(), transactionsDb.getAll(), transfersDb.getAll()]).then(([accs, txns, tfrs]) => {
        setAccounts(accs);
        setTransactions(txns);
        setTransfers(tfrs);
      });
      return () => {};
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const dateRange = useMemo(() => getDateRange(periodMode, periodDate), [periodMode, periodDate]);

  const balanceMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const acc of accounts) {
      const txNet = transactions
        .filter((t) => t.account_id === acc.id && t.date <= dateRange.end)
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
      const transferNet = transfers
        .filter((t) => t.date <= dateRange.end)
        .reduce((sum, t) => {
          if (t.from_account_id === acc.id) return sum - t.amount;
          if (t.to_account_id === acc.id) return sum + t.amount;
          return sum;
        }, 0);
      map[acc.id] = acc.initial_balance + txNet + transferNet;
    }
    return map;
  }, [accounts, transactions, transfers, dateRange]);

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
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingAccount) return;
    const account = deletingAccount;
    setDeletingAccount(null);
    await transfersDb.removeByAccount(account.id);
    await transactionsDb.removeByAccount(account.id);
    await accountsDb.remove(account.id);
    const [accs, txns, tfrs] = await Promise.all([accountsDb.getAll(), transactionsDb.getAll(), transfersDb.getAll()]);
    setAccounts(accs);
    setTransactions(txns);
    setTransfers(tfrs);
    Snackbar.show({ text: 'Account deleted', duration: Snackbar.LENGTH_SHORT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingAccount]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Period selector bar */}
      <View style={[styles.periodBar, { backgroundColor: bg, borderBottomColor: borderColor }]}>
        <PeriodSelector
          mode={periodMode}
          date={periodDate}
          onChange={setPeriod}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total balance card */}
        <View style={[styles.totalCard, { backgroundColor: accentColor }]}>
          <Text style={[styles.totalLabel, { color: onAccentColor + 'CC' }]}>Total Balance</Text>
          <Text style={[styles.totalAmount, { color: onAccentColor }]}>
            {formatAmount(totalBalance, currency, undefined, numberFormat)}
          </Text>
          <Text style={[styles.totalSub, { color: onAccentColor + 'A6' }]}>
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
            <AccountCard
              key={acc.id}
              account={acc}
              balance={balanceMap[acc.id] ?? acc.initial_balance}
              currency={currency}
              onPress={() => { setEditingAccount(acc); setFormOpen(true); }}
            />
          ))
        )}

        <TouchableOpacity
          style={[styles.newAccountBtn, { borderColor }]}
          onPress={() => { setEditingAccount(null); setFormOpen(true); }}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={20} color={accentColor} />
          <Text style={[styles.newAccountBtnText, { color: accentColor }]}>New Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <AccountFormSheet
        isOpen={formOpen}
        account={editingAccount}
        onClose={() => { setFormOpen(false); setEditingAccount(null); }}
        onDelete={() => {
          const acc = editingAccount;
          setFormOpen(false);
          setEditingAccount(null);
          if (acc) handleDeletePress(acc);
        }}
        deleteDisabled={accounts.length <= 1}
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
  card: {
    borderRadius: 14,
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
