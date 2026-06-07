import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import InfoModal from '@/shared/components/InfoModal';
import { Text } from '@/shared/components/Themed';
import { useBudgetsDb, useCategoriesDb } from '@/db';
import { useBudgetsStore } from './useBudgetsStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { getCurrencySymbol } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import { Snackbar } from 'react-native-snackbar';
import { requestNotificationPermission } from '@/features/backup/notifications';
import type { BudgetPeriod, BudgetWithDetails, Category } from '@/types';

const CATEGORY_GRID_3_ROWS = 230;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const PERIODS: { key: BudgetPeriod; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  budget?: BudgetWithDetails | null;
  onDelete?: () => void;
}

export default function BudgetFormSheet({ isOpen, onClose, budget = null, onDelete }: Props) {
  const budgetsDb = useBudgetsDb();
  const categoriesDb = useCategoriesDb();
  const addBudget = useBudgetsStore((s) => s.addBudget);
  const updateBudget = useBudgetsStore((s) => s.updateBudget);
  const allBudgets = useBudgetsStore((s) => s.budgets);
  const currencySymbol = getCurrencySymbol(useSettingsStore((s) => s.currency));

  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    categoriesDb.getByType('expense').then((cats) => {
      setCategories(cats);
      if (budget) {
        setSelectedCategory(cats.find((c) => c.id === budget.category_id) ?? null);
      } else {
        setSelectedCategory(null);
      }
    });
    if (budget) {
      setAmount(String(budget.amount));
      setPeriod(budget.period);
      setEditingId(budget.id);
    } else {
      setAmount('');
      setPeriod('monthly');
      setEditingId(null);
    }
    setAttempted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, budget]);

  // If the user picks a category that already has a budget while creating,
  // auto-switch the form into edit mode for the existing budget.
  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    if (editingId == null) {
      const existing = allBudgets.find((b) => b.category_id === cat.id);
      if (existing) {
        setEditingId(existing.id);
        setAmount(String(existing.amount));
        setPeriod(existing.period);
      }
    }
  };

  const validate = (): boolean => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return false;
    if (!selectedCategory) return false;
    return true;
  };

  const handleSave = useCallback(async () => {
    setAttempted(true);
    if (!validate()) return;
    const parsed = parseFloat(amount);

    try {
      if (editingId != null) {
        await budgetsDb.update(editingId, {
          category_id: selectedCategory!.id,
          amount: parsed,
          period,
        });
        const refreshed = await budgetsDb.getAll();
        const updated = refreshed.find((b) => b.id === editingId);
        if (updated) updateBudget(updated);
        Snackbar.show({ text: 'Budget updated', duration: Snackbar.LENGTH_SHORT });
      } else {
        const result = await budgetsDb.insert({
          category_id: selectedCategory!.id,
          amount: parsed,
          period,
        });
        const refreshed = await budgetsDb.getAll();
        const added = refreshed.find((b) => b.id === result.lastInsertRowId);
        if (added) addBudget(added);
        Snackbar.show({ text: 'Budget saved', duration: Snackbar.LENGTH_SHORT });
      }
      // Best-effort: ask for notification permission so we can alert when the
      // user crosses this budget's limit later. Silently ignored if denied.
      requestNotificationPermission().catch(() => {});
      triggerCloseRef.current();
    } catch {
      setErrorModal('Failed to save budget.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, period, selectedCategory, editingId]);

  const { accentColor, onAccentColor, cardBg: bg, textColor, subColor: subTextColor, inputBg, borderColor } = useAppTheme();

  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      sheetTranslateY.setValue(600);
      backdropOpacity.setValue(1);
      Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 14, overshootClamping: true, restSpeedThreshold: 100, restDisplacementThreshold: 40 }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const triggerCloseRef = useRef(() => {});
  triggerCloseRef.current = () => {
    sheetTranslateY.stopAnimation();
    backdropOpacity.stopAnimation();
    Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true })
      .start(() => {
        Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true })
          .start(() => { onCloseRef.current(); });
      });
  };

  const snapBack = () => {
    Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12, overshootClamping: true, restSpeedThreshold: 100, restDisplacementThreshold: 40 }).start();
  };

  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => sheetTranslateY.stopAnimation(),
    onPanResponderMove: (_, g) => { if (g.dy > 0) sheetTranslateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 0.3) triggerCloseRef.current();
      else snapBack();
    },
    onPanResponderTerminate: () => snapBack(),
  })).current;

  const amountInvalid = attempted && (!parseFloat(amount) || parseFloat(amount) <= 0);

  return (
    <>
      <Modal visible={isOpen} animationType="none" transparent onRequestClose={() => triggerCloseRef.current()}>
        <View style={styles.kvContainer}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => triggerCloseRef.current()} accessibilityLabel="Dismiss" accessibilityRole="button" />
          </Animated.View>

          <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: sheetTranslateY }] }]}>
            <View {...handlePan.panHandlers} style={styles.dragArea}>
              <View style={[styles.handle, { backgroundColor: borderColor }]} accessible={false} />
            </View>

            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                {editingId != null ? 'Edit Budget' : 'Add Budget'}
              </Text>
              <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
              {/* Amount (limit) */}
              <View style={[styles.amountContainer, { backgroundColor: inputBg, borderColor: amountInvalid ? '#F44336' : borderColor }]}>
                <Text style={[styles.currencySymbol, { color: subTextColor }]}>{currencySymbol}</Text>
                <TextInput
                  style={[styles.amountInput, { color: textColor }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={subTextColor}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  autoFocus={editingId == null}
                />
              </View>
              {amountInvalid && (
                <Text style={styles.errorText}>Enter a valid amount greater than 0</Text>
              )}

              {/* Period */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Period</Text>
              <View style={[styles.typeToggle, { backgroundColor: inputBg, marginBottom: 20 }]}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={[localStyles.periodBtn, period === p.key && { backgroundColor: accentColor }]}
                    onPress={() => setPeriod(p.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: period === p.key }}
                  >
                    <Text style={[localStyles.periodBtnText, { color: period === p.key ? onAccentColor : subTextColor }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category (expense only) */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Category</Text>
              <ScrollView
                scrollEnabled={categories.length > 9}
                style={categories.length > 9 ? localStyles.categoryGridScroll : undefined}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <View style={localStyles.categoryGrid}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={localStyles.categoryItem}
                        onPress={() => handleSelectCategory(cat)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={[localStyles.categoryCircle, { backgroundColor: cat.color }, isSelected && localStyles.categoryCircleSelected]}>
                          <MaterialIcons name={(cat.icon as any) || 'label'} size={20} color="#fff" />
                        </View>
                        <Text style={[localStyles.categoryLabel, { color: isSelected ? textColor : subTextColor }]} numberOfLines={1}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              {attempted && !selectedCategory && (
                <Text style={styles.errorText}>Please select a category</Text>
              )}

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave} accessibilityRole="button">
                <Text style={[styles.saveBtnText, { color: onAccentColor }]}>
                  {editingId != null ? 'Save Changes' : 'Save Budget'}
                </Text>
              </TouchableOpacity>

              {editingId != null && onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} accessibilityRole="button">
                  <Text style={styles.deleteBtnText}>Delete Budget</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <InfoModal
        visible={!!errorModal}
        onClose={() => setErrorModal(null)}
        icon="error"
        iconColor="#F44336"
        title="Error"
        message={errorModal ?? ''}
      />
    </>
  );
}

const localStyles = StyleSheet.create({
  categoryGridScroll: { maxHeight: CATEGORY_GRID_3_ROWS, marginBottom: 0 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryItem: { width: '30%', alignItems: 'center', gap: 4, paddingVertical: 4 },
  categoryCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  categoryCircleSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  categoryLabel: { fontSize: 11, textAlign: 'center' },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodBtnText: { fontWeight: '600', fontSize: 12 },
});

const styles = { ...sheetStyles, ...localStyles };
