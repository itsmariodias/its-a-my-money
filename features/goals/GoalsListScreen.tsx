import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  SectionList,
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
import AccountIcon from '@/shared/components/AccountIcon';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';
import { todayString } from '@/shared/dates';
import GoalFormSheet from './GoalFormSheet';
import { goalProgress, goalStatusColor, isActiveGoal, reservedByAccount, targetDateLabel } from './goalUtils';
import GoalPaceHint from './GoalPaceHint';
import { useAvailableBalances } from './useAvailableBalances';
import type { GoalWithDetails } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface GoalSection {
  /** The account the section groups; null for the Completed section at the bottom. */
  accountId: number | null;
  title: string;
  currency: string;
  reserved: number;
  data: GoalWithDetails[];
}

export default function GoalsListScreen({ isOpen, onClose }: Props) {
  const { bg, cardBg, textColor, subColor, borderColor, accentColor } = useAppTheme();
  const insets = useSafeAreaInsets();
  const goalsDb = useGoalsDb();
  const { goals, setGoals, removeGoal } = useGoalsStore();
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const availableByAccount = useAvailableBalances();

  // One section per account for active goals, then completed ones together at the bottom.
  // Goals arrive sorted by account name, then goal name.
  const sections = useMemo(() => {
    const reserved = reservedByAccount(goals);
    const byAccount = new Map<number, GoalSection>();
    const completed: GoalWithDetails[] = [];
    for (const g of goals) {
      if (!isActiveGoal(g)) {
        completed.push(g);
        continue;
      }
      let section = byAccount.get(g.account_id);
      if (!section) {
        section = {
          accountId: g.account_id,
          title: g.account_name,
          currency: g.account_currency,
          reserved: reserved[g.account_id] ?? 0,
          data: [],
        };
        byAccount.set(g.account_id, section);
      }
      section.data.push(g);
    }
    const result = [...byAccount.values()];
    if (completed.length > 0) {
      result.push({ accountId: null, title: 'Completed', currency: '', reserved: 0, data: completed });
    }
    return result;
  }, [goals]);

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

  const renderSectionHeader = ({ section }: { section: GoalSection }) => {
    if (section.accountId === null) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{section.title}</Text>
        </View>
      );
    }
    const available = availableByAccount[section.accountId] ?? 0;
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]} numberOfLines={1}>{section.title}</Text>
        <Text style={[styles.sectionSub, { color: subColor }]} numberOfLines={1}>
          Reserved {formatAmount(section.reserved, section.currency, undefined, numberFormat)} · Available{' '}
          <Text style={{ color: available < 0 ? '#F44336' : subColor }}>
            {formatAmount(available, section.currency, undefined, numberFormat)}
          </Text>
        </Text>
      </View>
    );
  };

  const renderItem = ({ item, index, section }: { item: GoalWithDetails; index: number; section: GoalSection }) => {
    const goalCurrency = item.account_currency;
    const { saved, pct } = goalProgress(item);
    const isCompleted = !isActiveGoal(item);
    // A completed goal is done whatever its date said, so it never reads as overdue.
    const color = goalStatusColor(pct, isCompleted ? null : item.target_date, accentColor, today);
    const barPct = Math.min(100, pct);
    const dateLabel = isCompleted ? item.account_name : targetDateLabel(item.target_date, today);
    const isFirst = index === 0;
    const isLast = index === section.data.length - 1;
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
        <View style={[styles.itemIcon, { backgroundColor: item.color }]}>
          <AccountIcon name={item.icon} size={20} color="#fff" />
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemRow}>
            <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
              {item.name}
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
          <GoalPaceHint goal={item} />
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

        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.list, goals.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.itemSeparator, { backgroundColor: borderColor }]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="flag" size={48} color={subColor} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No goals yet</Text>
              <Text style={[styles.emptySub, { color: subColor }]}>
                Tap + to set money aside for something. Put part of an income toward it, or add money by hand.
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
        message="This removes the goal and frees the money it holds. Transactions are kept."
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
  sectionHeader: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSub: { fontSize: 12, marginTop: 2 },
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
