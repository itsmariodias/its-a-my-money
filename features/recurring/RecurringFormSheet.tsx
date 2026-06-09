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
import DatePickerField from '@/shared/components/DatePickerField';
import InfoModal from '@/shared/components/InfoModal';
import { Text } from '@/shared/components/Themed';
import AccountIcon from '@/shared/components/AccountIcon';
import { useCategoriesDb, useRecurringDb } from '@/db';
import { useSQLiteContext } from 'expo-sqlite';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useRecurringStore } from './useRecurringStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { getCurrencySymbol } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import { Snackbar } from 'react-native-snackbar';
import type { Category, RecurringFrequency, RecurringKind, RecurringTransactionWithDetails } from '@/types';
import { advanceDate, todayString } from './dateUtils';

const CATEGORY_GRID_3_ROWS = 230;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const FREQUENCIES: { key: RecurringFrequency; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recurring?: RecurringTransactionWithDetails | null;
  onDelete?: () => void;
}

export default function RecurringFormSheet({ isOpen, onClose, recurring = null, onDelete }: Props) {
  const accounts = useAccountsStore((s) => s.accounts);
  const addRecurring = useRecurringStore((s) => s.addRecurring);
  const updateRecurring = useRecurringStore((s) => s.updateRecurring);
  const currencySymbol = getCurrencySymbol(useSettingsStore((s) => s.currency));

  const db = useSQLiteContext();
  const categoriesDb = useCategoriesDb();
  const recurringDb = useRecurringDb();

  const [kind, setKind] = useState<RecurringKind>('transaction');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const accountScrollRef = useRef<ScrollView>(null);
  const toAccountScrollRef = useRef<ScrollView>(null);
  const categoryScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (recurring) {
      setKind(recurring.kind);
      setType((recurring.type as 'expense' | 'income') ?? 'expense');
      setAmount(String(recurring.amount));
      setFrequency(recurring.frequency);
      setStartDate(recurring.start_date);
      setEndDate(recurring.end_date);
      setNote(recurring.note ?? '');
      setFromAccountId(recurring.account_id);
      setToAccountId(recurring.to_account_id);
      if (recurring.kind === 'transaction' && recurring.type) {
        categoriesDb.getByType(recurring.type).then((cats) => {
          setCategories(cats);
          setSelectedCategory(cats.find((c) => c.id === recurring.category_id) ?? null);
        });
      } else {
        setCategories([]);
        setSelectedCategory(null);
      }
    } else {
      setKind('transaction');
      setType('expense');
      setAmount('');
      setFrequency('monthly');
      setStartDate(todayString());
      setEndDate(null);
      setNote('');
      setSelectedCategory(null);
      setFromAccountId(accounts[0]?.id ?? null);
      setToAccountId(accounts[1]?.id ?? null);
      categoriesDb.getByType('expense').then(setCategories);
    }
    setAttempted(false);
  }, [isOpen, recurring]);

  useEffect(() => {
    if (!isOpen || kind !== 'transaction') return;
    categoriesDb.getByType(type).then((cats) => {
      setCategories(cats);
      if (recurring && recurring.kind === 'transaction' && type === recurring.type) {
        setSelectedCategory(cats.find((c) => c.id === recurring.category_id) ?? null);
      } else {
        setSelectedCategory(null);
      }
    });
  }, [type, kind]);

  const swapAccounts = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  };

  // Generate all overdue entries for a recurring rule immediately after save,
  // handling the case where the app already ran its daily check earlier today.
  const generateOverdue = useCallback(async (recurringId: number, parsedAmount: number) => {
    const today = todayString();
    if (startDate > today) return; // start date is in the future, nothing due yet
    await db.withTransactionAsync(async () => {
      let dueDate = startDate;
      while (dueDate <= today) {
        if (kind === 'transfer') {
          await db.runAsync(
            'INSERT INTO transfers (from_account_id, to_account_id, amount, note, date, recurring_transaction_id) VALUES (?, ?, ?, ?, ?, ?)',
            fromAccountId!, toAccountId!, parsedAmount, note.trim() || null, dueDate, recurringId
          );
          await db.runAsync(
            "UPDATE accounts SET current_value = current_value + ? WHERE id=? AND account_type='investment' AND current_value IS NOT NULL",
            -parsedAmount, fromAccountId!
          );
          await db.runAsync(
            "UPDATE accounts SET current_value = current_value + ? WHERE id=? AND account_type='investment' AND current_value IS NOT NULL",
            parsedAmount, toAccountId!
          );
        } else {
          await db.runAsync(
            'INSERT INTO transactions (amount, type, category_id, account_id, note, date, recurring_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            parsedAmount, type, selectedCategory!.id, fromAccountId!, note.trim() || null, dueDate, recurringId
          );
          await db.runAsync(
            "UPDATE accounts SET current_value = current_value + ? WHERE id=? AND account_type='investment' AND current_value IS NOT NULL",
            type === 'income' ? parsedAmount : -parsedAmount, fromAccountId!
          );
        }
        dueDate = advanceDate(dueDate, frequency);
      }
      const isActive = endDate == null || dueDate <= endDate ? 1 : 0;
      await db.runAsync(
        'UPDATE recurring_transactions SET next_due_date=?, is_active=? WHERE id=?',
        dueDate, isActive, recurringId
      );
    });
  }, [db, kind, startDate, type, selectedCategory, fromAccountId, toAccountId, note, frequency, endDate]);

  const validate = (): boolean => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return false;
    if (!fromAccountId) return false;
    if (endDate && endDate < startDate) return false;
    if (kind === 'transfer') {
      if (!toAccountId || toAccountId === fromAccountId) return false;
      // Recurring transfers carry a single amount, so cross-currency would require
      // inventing an FX rate every time they fire. Block it at the form.
      const fromAcc = accounts.find((a) => a.id === fromAccountId);
      const toAcc = accounts.find((a) => a.id === toAccountId);
      if (fromAcc && toAcc && (fromAcc.currency || '') !== (toAcc.currency || '')) return false;
    } else {
      if (!selectedCategory) return false;
    }
    return true;
  };

  const handleSave = useCallback(async () => {
    setAttempted(true);
    if (!validate()) return;
    const parsedAmount = parseFloat(amount);

    try {
      if (recurring) {
        // If start_date or frequency changed, recalculate next_due_date from the new
        // start_date so future entries align to the new pattern. Past entries are kept.
        let nextDueDate = recurring.next_due_date;
        if (startDate !== recurring.start_date || frequency !== recurring.frequency) {
          const today = todayString();
          let d = startDate;
          while (d <= today) d = advanceDate(d, frequency);
          nextDueDate = d;
        }
        await recurringDb.update(recurring.id, {
          amount: parsedAmount,
          kind,
          type: kind === 'transaction' ? type : null,
          category_id: kind === 'transaction' ? selectedCategory!.id : null,
          account_id: fromAccountId!,
          to_account_id: kind === 'transfer' ? toAccountId! : null,
          note: note.trim() || null,
          frequency,
          start_date: startDate,
          end_date: endDate,
          next_due_date: nextDueDate,
          is_active: recurring.is_active,
        });
        const updated = await recurringDb.getById(recurring.id);
        if (updated) updateRecurring(updated);
        Snackbar.show({ text: 'Recurring updated', duration: Snackbar.LENGTH_SHORT });
      } else {
        const result = await recurringDb.insert({
          amount: parsedAmount,
          kind,
          type: kind === 'transaction' ? type : null,
          category_id: kind === 'transaction' ? selectedCategory!.id : null,
          account_id: fromAccountId!,
          to_account_id: kind === 'transfer' ? toAccountId! : null,
          note: note.trim() || null,
          frequency,
          start_date: startDate,
          end_date: endDate,
          next_due_date: startDate,
          is_active: 1,
        });
        await generateOverdue(result.lastInsertRowId, parsedAmount);
        const added = await recurringDb.getById(result.lastInsertRowId);
        if (added) addRecurring(added);
        Snackbar.show({ text: 'Recurring saved', duration: Snackbar.LENGTH_SHORT });
      }
      triggerCloseRef.current();
    } catch {
      setErrorModal('Failed to save recurring.');
    }
  }, [amount, kind, type, selectedCategory, fromAccountId, toAccountId, frequency, startDate, endDate, note, recurring, generateOverdue]);

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

  const renderAccountList = (selectedId: number | null, onSelect: (id: number) => void, scrollRef: React.RefObject<ScrollView | null>, excludeId?: number | null) => (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll} contentContainerStyle={styles.accountScrollContent}>
      {accounts.filter((a) => a.id !== excludeId).map((acc) => {
        const isSelected = selectedId === acc.id;
        const accentBg = acc.color ?? '#55A3FF';
        return (
          <TouchableOpacity
            key={acc.id}
            style={[styles.accountCard, { backgroundColor: isSelected ? accentBg + '18' : inputBg, borderColor: isSelected ? accentBg : borderColor, borderWidth: isSelected ? 2 : 1 }]}
            onPress={() => onSelect(acc.id)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={[styles.accountCardIcon, { backgroundColor: accentBg }]}>
              <AccountIcon name={acc.icon ?? 'account-balance-wallet'} size={20} color="#fff" />
            </View>
            <Text style={[styles.accountCardName, { color: isSelected ? accentBg : textColor }]} numberOfLines={1}>
              {acc.name}
            </Text>
            {isSelected && (
              <View style={[styles.accountCardCheck, { backgroundColor: accentBg }]}>
                <MaterialIcons name="check" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

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
                {recurring ? 'Edit Recurring' : 'Add Recurring'}
              </Text>
              <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
              {/* Kind toggle — only when creating; editing keeps existing kind */}
              {!recurring && (
                <View style={[styles.typeToggle, { backgroundColor: inputBg, marginBottom: 14 }]}>
                  <TouchableOpacity
                    style={[styles.freqBtn, kind === 'transaction' && { backgroundColor: accentColor }]}
                    onPress={() => setKind('transaction')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: kind === 'transaction' }}
                  >
                    <Text style={[styles.freqBtnText, { color: kind === 'transaction' ? onAccentColor : subTextColor }]}>Transaction</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.freqBtn, kind === 'transfer' && { backgroundColor: accentColor }]}
                    onPress={() => setKind('transfer')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: kind === 'transfer' }}
                  >
                    <Text style={[styles.freqBtnText, { color: kind === 'transfer' ? onAccentColor : subTextColor }]}>Transfer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Amount */}
              <View style={[styles.amountContainer, { backgroundColor: inputBg, borderColor: attempted && (!parseFloat(amount) || parseFloat(amount) <= 0) ? '#F44336' : borderColor }]}>
                <Text style={[styles.currencySymbol, { color: subTextColor }]}>{currencySymbol}</Text>
                <TextInput
                  style={[styles.amountInput, { color: textColor }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={subTextColor}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  autoFocus={!recurring}
                />
              </View>
              {attempted && (!parseFloat(amount) || parseFloat(amount) <= 0) && (
                <Text style={styles.errorText}>Enter a valid amount greater than 0</Text>
              )}

              {/* Type toggle — transactions only */}
              {kind === 'transaction' && (
                <View style={[styles.typeToggle, { backgroundColor: inputBg }]}>
                  <TouchableOpacity
                    style={[styles.typeBtn, type === 'expense' && { backgroundColor: '#F44336' }]}
                    onPress={() => setType('expense')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: type === 'expense' }}
                  >
                    <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#fff' : subTextColor }]}>Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, type === 'income' && { backgroundColor: '#4CAF50' }]}
                    onPress={() => setType('income')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: type === 'income' }}
                  >
                    <Text style={[styles.typeBtnText, { color: type === 'income' ? '#fff' : subTextColor }]}>Income</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Frequency */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Repeat</Text>
              <View style={[styles.typeToggle, { backgroundColor: inputBg, marginBottom: 20 }]}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.freqBtn, frequency === f.key && { backgroundColor: accentColor }]}
                    onPress={() => setFrequency(f.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: frequency === f.key }}
                  >
                    <Text style={[styles.freqBtnText, { color: frequency === f.key ? onAccentColor : subTextColor }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category — transactions only */}
              {kind === 'transaction' && (
                <>
                  <Text style={[styles.sectionLabel, { color: subTextColor }]}>Category</Text>
                  <ScrollView
                    ref={categoryScrollRef}
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
                            onPress={() => setSelectedCategory(cat)}
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
                </>
              )}

              {/* Account(s) */}
              {kind === 'transfer' ? (
                <>
                  <View style={localStyles.transferHeader}>
                    <Text style={[styles.sectionLabel, { color: subTextColor, marginBottom: 0 }]}>From</Text>
                    <TouchableOpacity onPress={swapAccounts} hitSlop={8} accessibilityRole="button" accessibilityLabel="Swap accounts">
                      <MaterialIcons name="swap-vert" size={22} color={accentColor} />
                    </TouchableOpacity>
                  </View>
                  {renderAccountList(fromAccountId, setFromAccountId, accountScrollRef, toAccountId)}
                  {attempted && !fromAccountId && (
                    <Text style={styles.errorText}>Please select a source account</Text>
                  )}

                  <Text style={[styles.sectionLabel, { color: subTextColor }]}>To</Text>
                  {renderAccountList(toAccountId, setToAccountId, toAccountScrollRef, fromAccountId)}
                  {attempted && (!toAccountId || toAccountId === fromAccountId) && (
                    <Text style={styles.errorText}>Please select a different destination account</Text>
                  )}
                  {(() => {
                    const fromAcc = accounts.find((a) => a.id === fromAccountId);
                    const toAcc = accounts.find((a) => a.id === toAccountId);
                    const mismatched = fromAcc && toAcc && fromAccountId !== toAccountId
                      && (fromAcc.currency || '') !== (toAcc.currency || '');
                    return mismatched ? (
                      <Text style={styles.errorText}>
                        Recurring transfers must use the same currency on both sides ({fromAcc.currency} vs {toAcc.currency}). Create individual cross-currency transfers instead.
                      </Text>
                    ) : null;
                  })()}
                </>
              ) : (
                <>
                  <Text style={[styles.sectionLabel, { color: subTextColor }]}>Account</Text>
                  {renderAccountList(fromAccountId, setFromAccountId, accountScrollRef)}
                  {attempted && !fromAccountId && (
                    <Text style={styles.errorText}>Please select an account</Text>
                  )}
                </>
              )}

              {/* Start date — in edit mode, cannot move earlier than the original start date */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Start Date</Text>
              <DatePickerField
                date={startDate}
                onChange={setStartDate}
                minDate={recurring ? recurring.start_date : undefined}
              />

              {/* End date (optional) */}
              <TouchableOpacity
                style={localStyles.endDateToggle}
                onPress={() => setEndDate(endDate ? null : todayString())}
                activeOpacity={0.7}
              >
                <Text style={[localStyles.endDateToggleLabel, { color: subTextColor }]}>End Date</Text>
                <View style={[localStyles.checkbox, { borderColor: endDate ? accentColor : borderColor, backgroundColor: endDate ? accentColor : 'transparent' }]}>
                  {endDate && <MaterialIcons name="check" size={14} color={onAccentColor} />}
                </View>
              </TouchableOpacity>
              {endDate && <DatePickerField date={endDate} onChange={setEndDate} minDate={startDate} />}
              {attempted && endDate && endDate < startDate && (
                <Text style={styles.errorText}>End date must be after start date</Text>
              )}

              {/* Note */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Note (optional)</Text>
              <TextInput
                style={[styles.noteInput, { backgroundColor: inputBg, borderColor, color: textColor, fontSize: 15 }]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note..."
                placeholderTextColor={subTextColor}
                returnKeyType="done"
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave} accessibilityRole="button">
                <Text style={[styles.saveBtnText, { color: onAccentColor }]}>
                  {recurring ? 'Save Changes' : 'Save Recurring'}
                </Text>
              </TouchableOpacity>

              {recurring && onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} accessibilityRole="button">
                  <Text style={styles.deleteBtnText}>Delete Recurring</Text>
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
  endDateToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  endDateToggleLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  freqBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  freqBtnText: { fontWeight: '600', fontSize: 12 },
  transferHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
});

const styles = { ...sheetStyles, ...localStyles };
