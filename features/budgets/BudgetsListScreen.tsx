import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Snackbar } from 'react-native-snackbar';
import { Text } from '@/shared/components/Themed';
import DeleteModal from '@/shared/components/DeleteModal';
import InfoModal from '@/shared/components/InfoModal';
import { useBudgetsDb } from '@/db';
import { useBudgetsStore } from './useBudgetsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import BudgetFormSheet from './BudgetFormSheet';
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
  isOpen: boolean;
  onClose: () => void;
}

export default function BudgetsListScreen({ isOpen, onClose }: Props) {
  const { bg, cardBg, textColor, subColor, borderColor, accentColor } = useAppTheme();
  const insets = useSafeAreaInsets();
  const budgetsDb = useBudgetsDb();
  const { budgets, setBudgets, removeBudget } = useBudgetsStore();
  const transactions = useTransactionsStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<BudgetWithDetails | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    try {
      const items = await budgetsDb.getAll();
      setBudgets(items);
    } catch {
      // ignore
    }
  }, [budgetsDb, setBudgets]);

  useEffect(() => {
    if (isOpen) loadBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: BudgetWithDetails) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingItem(null);
    loadBudgets();
  };

  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await budgetsDb.remove(deletingItem.id);
      removeBudget(deletingItem.id);
      Snackbar.show({ text: 'Budget deleted', duration: Snackbar.LENGTH_SHORT });
    } catch {
      setErrorModal('Failed to delete budget.');
    } finally {
      setDeletingItem(null);
    }
  }, [deletingItem, budgetsDb, removeBudget]);

  const renderItem = ({ item, index }: { item: BudgetWithDetails; index: number }) => {
    const { start, end } = currentPeriodRange(item.period);
    const spent = spentInRange(transactions, item.category_id, start, end);
    const pct = item.amount > 0 ? (spent / item.amount) * 100 : 0;
    const color = statusColor(pct);
    const barPct = Math.min(100, pct);
    const isFirst = index === 0;
    const isLast = index === budgets.length - 1;
    const br = {
      borderTopLeftRadius: isFirst ? 12 : 0, borderTopRightRadius: isFirst ? 12 : 0,
      borderBottomLeftRadius: isLast ? 12 : 0, borderBottomRightRadius: isLast ? 12 : 0,
    };

    return (
      <TouchableOpacity
        style={[styles.item, br, { backgroundColor: cardBg }]}
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.itemIcon, { backgroundColor: item.category_color }]}>
          <MaterialIcons name={(item.category_icon as any) || 'label'} size={20} color="#fff" />
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemRow}>
            <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
              {item.category_name}
            </Text>
            <Text style={[styles.itemAmount, { color: textColor }]}>
              {formatAmount(spent, currency, undefined, numberFormat)} / {formatAmount(item.amount, currency, undefined, numberFormat)}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
            <View style={[styles.progressFill, { width: `${barPct}%`, backgroundColor: color }]} />
          </View>
          <View style={styles.itemRow}>
            <View style={[styles.periodBadge, { backgroundColor: accentColor + '22' }]}>
              <Text style={[styles.periodBadgeText, { color: accentColor }]}>
                {periodLabel(item.period)}
              </Text>
            </View>
            <Text style={[styles.itemPct, { color }]}>{Math.round(pct)}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor, paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <MaterialIcons name="close" size={24} color={subColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Budgets</Text>
          <TouchableOpacity onPress={handleAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add budget">
            <MaterialIcons name="add" size={26} color={accentColor} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={budgets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, budgets.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.itemSeparator, { backgroundColor: borderColor }]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="savings" size={48} color={subColor} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No budgets yet</Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                Tap + to set a spending limit for any expense category.
              </Text>
            </View>
          }
        />
      </View>

      <BudgetFormSheet
        isOpen={formOpen}
        onClose={handleFormClose}
        budget={editingItem}
        onDelete={editingItem ? () => { setFormOpen(false); setDeletingItem(editingItem); } : undefined}
      />

      <DeleteModal
        visible={!!deletingItem}
        title="Delete Budget?"
        message="This removes the budget. Past transactions are kept."
        showWarning={false}
        onCancel={() => setDeletingItem(null)}
        onConfirm={handleDelete}
      />

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
  itemBody: { flex: 1, gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { fontSize: 15, fontWeight: '600', flexShrink: 1, marginRight: 8 },
  itemAmount: { fontSize: 13, fontWeight: '600' },
  itemPct: { fontSize: 12, fontWeight: '700' },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  periodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  periodBadgeText: { fontSize: 11, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
