import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Snackbar } from 'react-native-snackbar';
import { Text } from '@/shared/components/Themed';
import DeleteModal from '@/shared/components/DeleteModal';
import InfoModal from '@/shared/components/InfoModal';
import { useRecurringDb, useTransactionsDb } from '@/db';
import { todayString } from './dateUtils';
import { useRecurringStore } from './useRecurringStore';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import RecurringFormSheet from './RecurringFormSheet';
import type { RecurringTransactionWithDetails, RecurringFrequency } from '@/types';

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecurringListScreen({ isOpen, onClose }: Props) {
  const { bg, cardBg, textColor, subColor, borderColor, accentColor, onAccentColor, inputBg } = useAppTheme();
  const insets = useSafeAreaInsets();
  const recurringDb = useRecurringDb();
  const transactionsDb = useTransactionsDb();
  const { recurringTransactions, setRecurringTransactions, removeRecurring } = useRecurringStore();
  const currency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransactionWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<RecurringTransactionWithDetails | null>(null);
  const [deleteLinked, setDeleteLinked] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const loadRecurring = useCallback(async () => {
    try {
      const items = await recurringDb.getAll();
      setRecurringTransactions(items);
    } catch {
      // ignore
    }
  }, [recurringDb, setRecurringTransactions]);

  useEffect(() => {
    if (isOpen) loadRecurring();
  }, [isOpen]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: RecurringTransactionWithDetails) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingItem(null);
    loadRecurring();
  };

  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      if (deleteLinked) {
        await transactionsDb.removeByRecurring(deletingItem.id);
      }
      await recurringDb.remove(deletingItem.id);
      removeRecurring(deletingItem.id);
      Snackbar.show({ text: 'Recurring transaction deleted', duration: Snackbar.LENGTH_SHORT });
    } catch {
      setErrorModal('Failed to delete recurring transaction.');
    } finally {
      setDeletingItem(null);
      setDeleteLinked(false);
    }
  }, [deletingItem, deleteLinked, recurringDb, transactionsDb, removeRecurring]);

  const renderItem = ({ item, index }: { item: RecurringTransactionWithDetails; index: number }) => {
    const amountColor = item.type === 'income' ? '#4CAF50' : '#F44336';
    const formattedAmount = formatAmount(item.amount, currency, item.type, numberFormat);
    const isInactive = item.is_active === 0 || (item.end_date != null && item.end_date < todayString());
    const isFirst = index === 0;
    const isLast = index === recurringTransactions.length - 1;
    const br = {
      borderTopLeftRadius: isFirst ? 12 : 0, borderTopRightRadius: isFirst ? 12 : 0,
      borderBottomLeftRadius: isLast ? 12 : 0, borderBottomRightRadius: isLast ? 12 : 0,
    };

    return (
      <TouchableOpacity
        style={[styles.item, br, { backgroundColor: cardBg, opacity: isInactive ? 0.5 : 1 }]}
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.itemIcon, { backgroundColor: item.category_color }]}>
          <MaterialIcons name={(item.category_icon as any) || 'autorenew'} size={20} color="#fff" />
        </View>
        <View style={styles.itemLeft}>
          <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
            {item.note || item.category_name}
          </Text>
          <Text style={[styles.itemSub, { color: subColor }]} numberOfLines={1}>
            {item.account_name}
          </Text>
          <Text style={[styles.itemNextDue, { color: subColor }]}>
            {isInactive ? 'Inactive' : `Next: ${item.next_due_date}`}
          </Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemAmount, { color: amountColor }]}>{formattedAmount}</Text>
          <View style={[styles.freqBadge, { backgroundColor: accentColor + '22' }]}>
            <Text style={[styles.freqBadgeText, { color: accentColor }]}>
              {FREQ_LABELS[item.frequency]}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={subColor} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor, paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <MaterialIcons name="close" size={24} color={subColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Recurring</Text>
          <TouchableOpacity onPress={handleAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add recurring transaction">
            <MaterialIcons name="add" size={26} color={accentColor} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={recurringTransactions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, recurringTransactions.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.itemSeparator, { backgroundColor: borderColor }]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="autorenew" size={48} color={subColor} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No recurring transactions</Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                Tap + to add subscriptions, bills, or any repeating expense or income.
              </Text>
            </View>
          }
        />
      </View>

      <RecurringFormSheet
        isOpen={formOpen}
        onClose={handleFormClose}
        recurring={editingItem}
        onDelete={editingItem ? () => { setFormOpen(false); setDeletingItem(editingItem); } : undefined}
      />

      {/* Delete confirmation */}
      <DeleteModal
        visible={!!deletingItem}
        title="Delete Recurring?"
        message={'This will stop future auto-generation.\nPast transactions are kept by default.'}
        showWarning={false}
        onCancel={() => { setDeletingItem(null); setDeleteLinked(false); }}
        onConfirm={handleDelete}
      >
        <TouchableOpacity
          style={styles.modalLinkedRow}
          onPress={() => setDeleteLinked((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.modalCheckbox, { borderColor: deleteLinked ? '#F44336' : borderColor, backgroundColor: deleteLinked ? '#F44336' : 'transparent' }]}>
            {deleteLinked && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
          <Text style={[styles.modalLinkedLabel, { color: deleteLinked ? '#F44336' : subColor }]}>
            Also delete past transactions
          </Text>
        </TouchableOpacity>
      </DeleteModal>

      <InfoModal
        visible={!!errorModal}
        onClose={() => setErrorModal(null)}
        icon="error"
        iconColor="#F44336"
        title="Error"
        message={errorModal ?? ''}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  list: { padding: 16 },
  listEmpty: { flex: 1 },

  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  itemSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 64, backgroundColor: 'transparent' },
  itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemLeft: { flex: 1, gap: 3 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemAmount: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 12 },
  itemNextDue: { fontSize: 11 },
  freqBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  freqBadgeText: { fontSize: 11, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  modalLinkedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingHorizontal: 4 },
  modalCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  modalLinkedLabel: { fontSize: 14 },
});
