import { useCallback, useEffect, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-snackbar';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import AddTransactionSheet from '@/features/transactions/AddTransactionSheet';
import TransferSheet from '@/features/transfers/TransferSheet';
import {
  PeriodSelector,
  getDateRange,
} from '@/shared/components/PeriodSelector';
import { useAccountsDb, useTransactionsDb, useTransfersDb } from '@/db';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useUIStore } from '@/shared/store/useUIStore';
import { formatAmount } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import type { TransactionWithDetails, TransferWithDetails } from '@/types';


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
  const { isDark, cardBg, inputBg, textColor, subColor, borderColor } = useAppTheme();
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
              <View style={[dlStyles.chipIcon, { backgroundColor: tx.category_color || '#9E9E9E' }]}>
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
              <Text style={[dlStyles.chipAmount, { color: tx.type === 'income' ? '#4CAF50' : '#F44336' }]}>
                {formatAmount(tx.amount, currency, tx.type, numberFormat)}
              </Text>
            </View>
          )}

          <Text style={[dlStyles.message, { color: subColor }]}>
            This transaction will be permanently removed from your records.
          </Text>

          <View style={dlStyles.warningRow}>
            <MaterialIcons name="warning-amber" size={14} color="#FFC107" />
            <Text style={dlStyles.warningText}>This action cannot be undone.</Text>
          </View>

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
            <TouchableOpacity style={dlStyles.btn} onPress={onConfirm} activeOpacity={0.7} accessibilityRole="button" accessibilityHint="Double tap to permanently delete">
              <MaterialIcons name="delete" size={16} color="#F44336" />
              <Text style={[dlStyles.btnText, { color: '#F44336' }]}>Delete</Text>
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
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

// ─── DeleteTransferModal ──────────────────────────────────────────────────────

interface DeleteTransferModalProps {
  transfer: TransferWithDetails | null;
  currency: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteTransferModal({ transfer, currency, onCancel, onConfirm }: DeleteTransferModalProps) {
  const { cardBg, inputBg, textColor, subColor, borderColor } = useAppTheme();
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  return (
    <Modal visible={transfer !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={dlStyles.backdrop} onPress={onCancel}>
        <Pressable style={[dlStyles.card, { backgroundColor: cardBg }]} onPress={() => {}}>
          <View style={dlStyles.iconCircle}>
            <MaterialIcons name="delete-forever" size={30} color="#fff" />
          </View>

          <Text style={[dlStyles.title, { color: textColor }]}>Delete Transfer?</Text>

          {transfer && (
            <View style={[dlStyles.txChip, { backgroundColor: inputBg, borderColor }]}>
              <View style={dlStyles.chipInfo}>
                <Text style={[dlStyles.chipName, { color: textColor }]} numberOfLines={1}>
                  {transfer.from_account_name} → {transfer.to_account_name}
                </Text>
                <Text style={[dlStyles.chipSub, { color: subColor }]}>{transfer.date}</Text>
              </View>
              <Text style={[dlStyles.chipAmount, { color: textColor }]}>
                {formatAmount(transfer.amount, currency, 'expense', numberFormat)}
              </Text>
            </View>
          )}

          <Text style={[dlStyles.message, { color: subColor }]}>
            This transfer will be permanently removed from your records.
          </Text>

          <View style={dlStyles.warningRow}>
            <MaterialIcons name="warning-amber" size={14} color="#FFC107" />
            <Text style={dlStyles.warningText}>This action cannot be undone.</Text>
          </View>

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
            <TouchableOpacity style={dlStyles.btn} onPress={onConfirm} activeOpacity={0.7} accessibilityRole="button" accessibilityHint="Double tap to permanently delete">
              <MaterialIcons name="delete" size={16} color="#F44336" />
              <Text style={[dlStyles.btnText, { color: '#F44336' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── TransactionRow ───────────────────────────────────────────────────────────

interface RowProps {
  tx: TransactionWithDetails;
  isFirst: boolean;
  isLast: boolean;
  cardBg: string;
  borderColor: string;
  textColor: string;
  subTextColor: string;
  currency: string;
  onPress: () => void;
}

function TransactionRow({ tx, isFirst, isLast, cardBg, borderColor, textColor, subTextColor, currency, onPress }: RowProps) {
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const amountColor = tx.type === 'income' ? '#4CAF50' : '#F44336';

  return (
    <TouchableOpacity
      style={[
        rowStyles.row,
        isFirst && rowStyles.rowFirst,
        isLast && rowStyles.rowLast,
        { backgroundColor: cardBg },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${tx.category_name}, ${formatAmount(tx.amount, currency, tx.type, numberFormat)}, ${tx.date}`}
      accessibilityHint="Double tap to edit"
    >
      <View style={[rowStyles.icon, { backgroundColor: tx.category_color || '#9E9E9E' }]}>
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
  );
}

// ─── TransferRow ──────────────────────────────────────────────────────────────

interface TransferRowProps {
  transfer: TransferWithDetails;
  selectedAccountId: number;
  isFirst: boolean;
  isLast: boolean;
  cardBg: string;
  borderColor: string;
  textColor: string;
  subTextColor: string;
  currency: string;
  onPress: () => void;
}

function TransferRow({ transfer, selectedAccountId, isFirst, isLast, cardBg, borderColor, textColor, subTextColor, currency, onPress }: TransferRowProps) {
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const isOutgoing = transfer.from_account_id === selectedAccountId;
  const otherName = isOutgoing ? transfer.to_account_name : transfer.from_account_name;
  const label = isOutgoing ? `To ${otherName}` : `From ${otherName}`;
  const amountColor = isOutgoing ? '#F44336' : '#4CAF50';
  const amountType = isOutgoing ? 'expense' : 'income';

  return (
    <TouchableOpacity
      style={[
        rowStyles.row,
        isFirst && rowStyles.rowFirst,
        isLast && rowStyles.rowLast,
        { backgroundColor: cardBg },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatAmount(transfer.amount, currency, amountType, numberFormat)}, ${transfer.date}`}
      accessibilityHint="Double tap to edit"
    >
      <View style={[rowStyles.icon, { backgroundColor: '#9E9E9E' }]}>
        <MaterialIcons name="swap-horiz" size={18} color="#fff" />
      </View>
      <View style={rowStyles.info}>
        <Text style={[rowStyles.category, { color: textColor }]}>{label}</Text>
        {transfer.note ? (
          <Text style={[rowStyles.sub, { color: subTextColor }]} numberOfLines={1}>
            {transfer.note}
          </Text>
        ) : null}
      </View>
      <Text style={[rowStyles.amount, { color: amountColor }]}>
        {formatAmount(transfer.amount, currency, amountType, numberFormat)}
      </Text>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  rowLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
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

// ─── CategoryFilterBar ────────────────────────────────────────────────────────

type CategoryInfo = { id: number; name: string; color: string; icon: string };

interface CategoryFilterBarProps {
  categories: CategoryInfo[];
  selectedIds: number[];
  onToggleCategory: (id: number) => void;
  onClearFilter: () => void;
  viewMode: 'list' | 'grouped';
  onToggleViewMode: () => void;
  accentColor: string;
  inputBg: string;
  textColor: string;
  borderColor: string;
  bg: string;
}

function CategoryFilterBar({
  categories,
  selectedIds,
  onToggleCategory,
  onClearFilter,
  viewMode,
  onToggleViewMode,
  accentColor,
  inputBg,
  textColor,
  borderColor,
  bg,
}: CategoryFilterBarProps) {
  const allActive = selectedIds.length === 0;

  return (
    <View style={[filterStyles.bar, { backgroundColor: bg, borderBottomColor: borderColor }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={filterStyles.chipsContainer}
      >
        {/* All chip */}
        <TouchableOpacity
          style={[
            filterStyles.chip,
            allActive
              ? { backgroundColor: accentColor }
              : { backgroundColor: inputBg, borderWidth: StyleSheet.hairlineWidth, borderColor },
          ]}
          onPress={onClearFilter}
          activeOpacity={0.7}
        >
          <Text style={[filterStyles.chipText, { color: allActive ? '#fff' : textColor }]}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const active = selectedIds.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                filterStyles.chip,
                active
                  ? { backgroundColor: cat.color }
                  : { backgroundColor: inputBg, borderWidth: StyleSheet.hairlineWidth, borderColor },
              ]}
              onPress={() => onToggleCategory(cat.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={(cat.icon as any) || 'label'}
                size={13}
                color={active ? '#fff' : cat.color}
              />
              <Text style={[filterStyles.chipText, { color: active ? '#fff' : textColor }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* View mode toggle */}
      <View style={[filterStyles.toggleGroup, { borderLeftColor: borderColor }]}>
        <TouchableOpacity
          style={filterStyles.toggleBtn}
          onPress={viewMode === 'grouped' ? onToggleViewMode : undefined}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="view-list"
            size={20}
            color={viewMode === 'list' ? accentColor : textColor}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={filterStyles.toggleBtn}
          onPress={viewMode === 'list' ? onToggleViewMode : undefined}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="table-rows"
            size={20}
            color={viewMode === 'grouped' ? accentColor : textColor}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const filterStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  toggleBtn: {
    padding: 4,
  },
});

// ─── CategoryGroupRow ─────────────────────────────────────────────────────────

type CategoryGroup = {
  category_id: number;      // -1 for the synthetic Transfers group
  category_name: string;
  category_color: string;
  category_icon: string;
  total: number;
  count: number;
  transactions: TransactionWithDetails[];
  transfers?: TransferWithDetails[];
};

interface CategoryGroupRowProps {
  group: CategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onPressTx: (tx: TransactionWithDetails) => void;
  onPressTransfer: (t: TransferWithDetails) => void;
  selectedAccountId: number | null;
  currency: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  subColor: string;
}

function CategoryGroupRow({
  group,
  isExpanded,
  onToggle,
  onPressTx,
  onPressTransfer,
  selectedAccountId,
  currency,
  cardBg,
  borderColor,
  textColor,
  subColor,
}: CategoryGroupRowProps) {
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const totalColor = group.total === 0 ? subColor : group.total >= 0 ? '#4CAF50' : '#F44336';
  const totalType = group.total >= 0 ? 'income' : 'expense';
  const countLabel = group.count === 1 ? '1 item' : `${group.count} items`;

  return (
    <View style={groupStyles.wrapper}>
      {/* Category header row */}
      <TouchableOpacity
        style={[groupStyles.header, { backgroundColor: cardBg }]}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${group.category_name}, ${countLabel}`}
      >
        <View style={[groupStyles.icon, { backgroundColor: group.category_color || '#9E9E9E' }]}>
          <MaterialIcons name={(group.category_icon as any) || 'label'} size={18} color="#fff" />
        </View>
        <View style={groupStyles.headerInfo}>
          <Text style={[groupStyles.categoryName, { color: textColor }]}>{group.category_name}</Text>
          <Text style={[groupStyles.countText, { color: subColor }]}>{countLabel}</Text>
        </View>
        <Text style={[groupStyles.total, { color: totalColor }]}>
          {formatAmount(Math.abs(group.total), currency, totalType, numberFormat)}
        </Text>
        <MaterialIcons
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={20}
          color={subColor}
          style={groupStyles.chevron}
        />
      </TouchableOpacity>

      {/* Expanded rows */}
      {isExpanded && (
        <View style={[groupStyles.expandedContainer, { borderTopColor: borderColor }]}>
          {group.transfers
            ? group.transfers.map((t, index) => {
                const isLast = index === group.transfers!.length - 1;
                const isOutgoing = t.from_account_id === selectedAccountId;
                const label = isOutgoing ? `To ${t.to_account_name}` : `From ${t.from_account_name}`;
                const amountColor = isOutgoing ? '#F44336' : '#4CAF50';
                const amountType = isOutgoing ? 'expense' : 'income';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      groupStyles.txRow,
                      { backgroundColor: cardBg },
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
                      isLast && groupStyles.txRowLast,
                    ]}
                    onPress={() => onPressTransfer(t)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to edit"
                  >
                    <View style={groupStyles.txRowIndent} />
                    <View style={groupStyles.txInfo}>
                      <Text style={[groupStyles.txNote, { color: textColor }]} numberOfLines={1}>
                        {label}
                      </Text>
                      <Text style={[groupStyles.txSub, { color: subColor }]}>
                        {t.note ? `${t.note} · ` : ''}{formatDateHeader(t.date)}
                      </Text>
                    </View>
                    <Text style={[groupStyles.txAmount, { color: amountColor }]}>
                      {formatAmount(t.amount, currency, amountType, numberFormat)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : group.transactions.map((tx, index) => {
                const isLast = index === group.transactions.length - 1;
                const amountColor = tx.type === 'income' ? '#4CAF50' : '#F44336';
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={[
                      groupStyles.txRow,
                      { backgroundColor: cardBg },
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
                      isLast && groupStyles.txRowLast,
                    ]}
                    onPress={() => onPressTx(tx)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to edit"
                  >
                    <View style={groupStyles.txRowIndent} />
                    <View style={groupStyles.txInfo}>
                      <Text style={[groupStyles.txNote, { color: textColor }]} numberOfLines={1}>
                        {tx.note || tx.account_name}
                      </Text>
                      <Text style={[groupStyles.txSub, { color: subColor }]}>
                        {tx.account_name}{tx.note ? ` · ${formatDateHeader(tx.date)}` : ` · ${formatDateHeader(tx.date)}`}
                      </Text>
                    </View>
                    <Text style={[groupStyles.txAmount, { color: amountColor }]}>
                      {formatAmount(tx.amount, currency, tx.type, numberFormat)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
        </View>
      )}
    </View>
  );
}

const groupStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  countText: {
    fontSize: 12,
  },
  total: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  chevron: {
    marginLeft: 2,
  },
  expandedContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingVertical: 10,
  },
  txRowLast: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  txRowIndent: {
    width: 52,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txNote: {
    fontSize: 13,
    fontWeight: '500',
  },
  txSub: {
    fontSize: 11,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
});

// ─── List item union type ──────────────────────────────────────────────────────

type ListItem =
  | { kind: 'tx'; item: TransactionWithDetails }
  | { kind: 'transfer'; item: TransferWithDetails };

interface Section {
  title: string;
  date: string;
  net: number;
  data: ListItem[];
}

// ─── TransactionsScreen ───────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { isDark, bg, cardBg, inputBg, textColor, subColor: subTextColor, borderColor, accentColor } = useAppTheme();

  const selectedId = useUIStore((s) => s.selectedAccountId);
  const periodMode = useUIStore((s) => s.periodMode);
  const periodDate = useUIStore((s) => s.periodDate);
  const setPeriod = useUIStore((s) => s.setPeriod);
  const [editingTx, setEditingTx] = useState<TransactionWithDetails | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionWithDetails | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferWithDetails | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<TransferWithDetails | null>(null);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const transactionsDb = useTransactionsDb();
  const accountsDb = useAccountsDb();
  const transfersDb = useTransfersDb();
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const setTransfers = useTransfersStore((s) => s.setTransfers);
  const removeTransfer = useTransfersStore((s) => s.removeTransfer);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const currency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  useFocusEffect(
    useCallback(() => {
      Promise.all([transactionsDb.getAll(), accountsDb.getAll(), transfersDb.getAll()]).then(([txns, accs, tfrs]) => {
        setTransactions(txns);
        setAccounts(accs);
        setTransfers(tfrs);
      });
      return () => {};
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const dateRange = useMemo(() => getDateRange(periodMode, periodDate), [periodMode, periodDate]);

  const filteredTx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.date >= dateRange.start &&
          t.date <= dateRange.end &&
          (selectedId === null || t.account_id === selectedId)
      ),
    [transactions, selectedId, dateRange]
  );

  // Reset category filter when the period/account context changes
  useEffect(() => {
    setSelectedCategoryIds([]);
  }, [filteredTx]);

  // Unique categories present in the current filtered set (+ Transfers chip if applicable)
  const availableCategories = useMemo<CategoryInfo[]>(() => {
    const seen = new Map<number, CategoryInfo>();
    for (const tx of filteredTx) {
      if (!seen.has(tx.category_id))
        seen.set(tx.category_id, {
          id: tx.category_id,
          name: tx.category_name,
          color: tx.category_color,
          icon: tx.category_icon,
        });
    }
    const result = Array.from(seen.values());
    const hasTransfers =
      selectedId !== null &&
      transfers.some(
        (t) =>
          t.date >= dateRange.start &&
          t.date <= dateRange.end &&
          (t.from_account_id === selectedId || t.to_account_id === selectedId)
      );
    if (hasTransfers) {
      result.push({ id: -1, name: 'Transfers', color: '#9E9E9E', icon: 'swap-horiz' });
    }
    return result;
  }, [filteredTx, transfers, selectedId, dateRange]);

  const categoryFilteredTx = useMemo(
    () =>
      selectedCategoryIds.length === 0
        ? filteredTx
        : filteredTx.filter((t) => selectedCategoryIds.includes(t.category_id)),
    [filteredTx, selectedCategoryIds]
  );

  const toggleCategory = useCallback((id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((m) => (m === 'list' ? 'grouped' : 'list'));
    setExpandedCategories(new Set());
  }, []);

  const toggleExpand = useCallback((categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const mergedItems = useMemo<ListItem[]>(() => {
    const txItems: ListItem[] = categoryFilteredTx.map((item) => ({ kind: 'tx', item }));
    if (selectedId === null) return txItems;

    // Hide transfers when a category filter is active and Transfers chip (-1) is not selected
    const showTransfers = selectedCategoryIds.length === 0 || selectedCategoryIds.includes(-1);
    if (!showTransfers) return txItems;

    const transferItems: ListItem[] = transfers
      .filter(
        (t) =>
          t.date >= dateRange.start &&
          t.date <= dateRange.end &&
          (t.from_account_id === selectedId || t.to_account_id === selectedId)
      )
      .map((item) => ({ kind: 'transfer', item }));

    return [...txItems, ...transferItems].sort((a, b) => {
      if (b.item.date !== a.item.date) return b.item.date.localeCompare(a.item.date);
      return b.item.created_at.localeCompare(a.item.created_at);
    });
  }, [categoryFilteredTx, transfers, selectedId, dateRange, selectedCategoryIds]);

  const sections = useMemo<Section[]>(() => {
    const byDate: Record<string, ListItem[]> = {};
    for (const listItem of mergedItems) {
      const d = listItem.item.date;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(listItem);
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({
        title: formatDateHeader(date),
        date,
        net: data.reduce((sum, listItem) => {
          if (listItem.kind === 'tx') {
            return sum + (listItem.item.type === 'income' ? listItem.item.amount : -listItem.item.amount);
          } else {
            if (listItem.item.from_account_id === selectedId) return sum - listItem.item.amount;
            if (listItem.item.to_account_id === selectedId) return sum + listItem.item.amount;
            return sum;
          }
        }, 0),
        data,
      }));
  }, [mergedItems, selectedId]);

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    if (viewMode !== 'grouped') return [];
    const map = new Map<number, CategoryGroup>();
    for (const tx of categoryFilteredTx) {
      if (!map.has(tx.category_id))
        map.set(tx.category_id, {
          category_id: tx.category_id,
          category_name: tx.category_name,
          category_color: tx.category_color,
          category_icon: tx.category_icon,
          total: 0,
          count: 0,
          transactions: [],
        });
      const g = map.get(tx.category_id)!;
      g.total += tx.type === 'income' ? tx.amount : -tx.amount;
      g.count += 1;
      g.transactions.push(tx);
    }
    const groups = Array.from(map.values()).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    // Append a synthetic Transfers group when an account is selected
    const scopedTransfers = selectedId !== null
      ? transfers.filter(
          (t) =>
            t.date >= dateRange.start &&
            t.date <= dateRange.end &&
            (t.from_account_id === selectedId || t.to_account_id === selectedId)
        )
      : [];
    const showTransfers = selectedCategoryIds.length === 0 || selectedCategoryIds.includes(-1);
    if (scopedTransfers.length > 0 && showTransfers) {
      const transferTotal = scopedTransfers.reduce((sum, t) => {
        if (t.from_account_id === selectedId) return sum - t.amount;
        if (t.to_account_id === selectedId) return sum + t.amount;
        return sum;
      }, 0);
      groups.push({
        category_id: -1,
        category_name: 'Transfers',
        category_color: '#9E9E9E',
        category_icon: 'swap-horiz',
        total: transferTotal,
        count: scopedTransfers.length,
        transactions: [],
        transfers: scopedTransfers,
      });
    }

    return groups;
  }, [viewMode, categoryFilteredTx, transfers, selectedId, dateRange, selectedCategoryIds]);

  const handleDeleteCancel = useCallback(() => {
    setDeletingTx(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingTx) return;
    const id = deletingTx.id;
    setDeletingTx(null);
    await transactionsDb.remove(id);
    const txns = await transactionsDb.getAll();
    setTransactions(txns);
    Snackbar.show({ text: 'Transaction deleted', duration: Snackbar.LENGTH_SHORT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingTx]);

  const handleTransferDeleteConfirm = useCallback(async () => {
    if (!deletingTransfer) return;
    const id = deletingTransfer.id;
    setDeletingTransfer(null);
    await transfersDb.remove(id);
    removeTransfer(id);
    Snackbar.show({ text: 'Transfer deleted', duration: Snackbar.LENGTH_SHORT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingTransfer]);

  const isEmpty = viewMode === 'grouped' ? categoryGroups.length === 0 : mergedItems.length === 0;

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

      {/* Category filter bar */}
      {availableCategories.length > 0 && (
        <CategoryFilterBar
          categories={availableCategories}
          selectedIds={selectedCategoryIds}
          onToggleCategory={toggleCategory}
          onClearFilter={() => setSelectedCategoryIds([])}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          accentColor={accentColor}
          inputBg={inputBg}
          textColor={textColor}
          borderColor={borderColor}
          bg={bg}
        />
      )}

      {/* Content */}
      {isEmpty ? (
        <View style={[styles.emptyContainer, { backgroundColor: bg }]}>
          <MaterialIcons name="receipt-long" size={56} color={subTextColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No transactions</Text>
          <Text style={[styles.emptyHint, { color: subTextColor }]}>
            No transactions found for this period
          </Text>
        </View>
      ) : viewMode === 'grouped' ? (
        <FlatList
          style={{ backgroundColor: bg, zIndex: 1 }}
          contentContainerStyle={[styles.listContent, { backgroundColor: bg }]}
          data={categoryGroups}
          keyExtractor={(g) => String(g.category_id)}
          renderItem={({ item }) => (
            <CategoryGroupRow
              group={item}
              isExpanded={expandedCategories.has(item.category_id)}
              onToggle={() => toggleExpand(item.category_id)}
              onPressTx={setEditingTx}
              onPressTransfer={setEditingTransfer}
              selectedAccountId={selectedId}
              currency={currency}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={textColor}
              subColor={subTextColor}
            />
          )}
        />
      ) : (
        <SectionList
          style={{ backgroundColor: bg, zIndex: 1 }}
          contentContainerStyle={[styles.listContent, { backgroundColor: bg }]}
          sections={sections}
          keyExtractor={(item) => `${item.kind}-${item.item.id}`}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: bg }]}>
              <Text style={[styles.sectionDate, { color: textColor }]}>{section.title}</Text>
              <Text style={[styles.sectionNet, { color: section.net >= 0 ? '#4CAF50' : '#F44336' }]}>
                {formatAmount(section.net, currency, undefined, numberFormat)}
              </Text>
            </View>
          )}
          renderItem={({ item: listItem, index, section }) => {
            const isFirst = index === 0;
            const isLast = index === section.data.length - 1;
            const commonProps = { isFirst, isLast, cardBg, borderColor, textColor, subTextColor, currency };
            if (listItem.kind === 'transfer') {
              return (
                <TransferRow
                  {...commonProps}
                  transfer={listItem.item}
                  selectedAccountId={selectedId ?? listItem.item.from_account_id}
                  onPress={() => setEditingTransfer(listItem.item)}
                />
              );
            }
            return (
              <TransactionRow
                {...commonProps}
                tx={listItem.item}
                onPress={() => setEditingTx(listItem.item)}
              />
            );
          }}
        />
      )}

      <AddTransactionSheet
        isOpen={editingTx !== null}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onDelete={() => { const tx = editingTx; setEditingTx(null); setDeletingTx(tx); }}
      />

      <TransferSheet
        isOpen={editingTransfer !== null}
        onClose={() => setEditingTransfer(null)}
        transfer={editingTransfer}
        onDelete={() => { const t = editingTransfer; setEditingTransfer(null); setDeletingTransfer(t); }}
      />

      <DeleteTransferModal
        transfer={deletingTransfer}
        currency={currency}
        onCancel={() => setDeletingTransfer(null)}
        onConfirm={handleTransferDeleteConfirm}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
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
