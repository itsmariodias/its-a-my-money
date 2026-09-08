import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useGoalsDb } from '@/db';
import { useGoalsStore } from './useGoalsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { buildAccountCurrencyMap } from '@/features/accounts/currencyUtils';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { todayString } from '@/features/recurring/dateUtils';
import GoalFormSheet from './GoalFormSheet';
import { goalProgress, goalStatusColor, targetDateLabel } from './goalUtils';
import type { GoalWithDetails } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoalsListScreen({ isOpen, onClose }: Props) {
  const { bg, cardBg, textColor, subColor, borderColor, accentColor } = useAppTheme();
  const insets = useSafeAreaInsets();
  const goalsDb = useGoalsDb();
  const { goals, setGoals, removeGoal } = useGoalsStore();
  const transactions = useTransactionsStore((s) => s.transactions);
  const accounts = useAccountsStore((s) => s.accounts);
  const globalCurrency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  const accountCurrencyById = useMemo(
    () => buildAccountCurrencyMap(accounts, globalCurrency),
    [accounts, globalCurrency],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GoalWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<GoalWithDetails | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const items = await goalsDb.getAll();
      setGoals(items);
    } catch {
      // ignore
    }
  }, [goalsDb, setGoals]);

  useEffect(() => {
    if (isOpen) loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: GoalWithDetails) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingItem(null);
    loadGoals();
  };

  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await goalsDb.remove(deletingItem.id);
      removeGoal(deletingItem.id);
      Snackbar.show({ text: 'Goal deleted', duration: Snackbar.LENGTH_SHORT });
    } catch {
      setErrorModal('Failed to delete goal.');
    } finally {
      setDeletingItem(null);
    }
  }, [deletingItem, goalsDb, removeGoal]);

  const today = todayString();

  const renderItem = ({ item, index }: { item: GoalWithDetails; index: number }) => {
    const goalCurrency = item.currency || globalCurrency;
    const { saved, pct } = goalProgress(item, transactions, {
      currency: goalCurrency,
      accountCurrencyById,
    });
    const color = goalStatusColor(pct, item.target_date, accentColor, today);
    const barPct = Math.min(100, pct);
    const dateLabel = targetDateLabel(item.target_date, today);
    const isFirst = index === 0;
    const isLast = index === goals.length - 1;
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
              {formatAmount(saved, goalCurrency, undefined, numberFormat)} / {formatAmount(item.target_amount, goalCurrency, undefined, numberFormat)}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
            <View style={[styles.progressFill, { width: `${barPct}%`, backgroundColor: color }]} />
          </View>
          <View style={styles.itemRow}>
            {dateLabel ? (
              <View style={[styles.dateBadge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.dateBadgeText, { color }]}>{dateLabel}</Text>
              </View>
            ) : (
              <View />
            )}
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
          <Text style={[styles.headerTitle, { color: textColor }]}>Goals</Text>
          <TouchableOpacity onPress={handleAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add goal">
            <MaterialIcons name="add" size={26} color={accentColor} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={goals}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, goals.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.itemSeparator, { backgroundColor: borderColor }]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="flag" size={48} color={subColor} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No goals yet</Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                Tap + to start working toward something. Spend in the category fills the bar.
              </Text>
            </View>
          }
        />
      </View>

      <GoalFormSheet
        isOpen={formOpen}
        onClose={handleFormClose}
        goal={editingItem}
        onDelete={editingItem ? () => { setFormOpen(false); setDeletingItem(editingItem); } : undefined}
      />

      <DeleteModal
        visible={!!deletingItem}
        title="Delete Goal?"
        message="This removes the goal. Past transactions are kept."
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

  dateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  dateBadgeText: { fontSize: 11, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
