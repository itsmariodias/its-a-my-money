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
import CategoryFormSheet from '@/features/transactions/CategoryFormSheet';
import { useCategoriesDb, useTransactionsDb } from '@/db';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useUIStore } from '@/shared/store/useUIStore';
import { Snackbar } from 'react-native-snackbar';
import { getCurrencySymbol } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import type { Category, TransactionWithDetails } from '@/types';

// Height for 3 rows of category items: 3 × (paddingV 8 + circle 44 + gap 4 + label 14) + 2 × row-gap 8
const CATEGORY_GRID_3_ROWS = 230;

const SCREEN_HEIGHT = Dimensions.get('window').height;

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const today = () => toLocalDateString(new Date());

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the sheet opens in edit mode pre-filled with the transaction. */
  transaction?: TransactionWithDetails | null;
  onDelete?: () => void;
}

export default function AddTransactionSheet({ isOpen, onClose, transaction = null, onDelete }: Props) {

  const accounts = useAccountsStore((s) => s.accounts);
  const addTransaction = useTransactionsStore((s) => s.addTransaction);
  const updateTransaction = useTransactionsStore((s) => s.updateTransaction);
  const currencySymbol = getCurrencySymbol(useSettingsStore((s) => s.currency));

  const categoriesDb = useCategoriesDb();
  const transactionsDb = useTransactionsDb();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);

  // Populate / reset fields when the sheet opens or the target transaction changes
  useEffect(() => {
    if (!isOpen) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setNote(transaction.note ?? '');
      setDate(transaction.date);
      setSelectedAccountId(transaction.account_id);
      categoriesDb.getByType(transaction.type).then((cats) => {
        setCategories(cats);
        setSelectedCategory(cats.find((c) => c.id === transaction.category_id) ?? null);
      });
    } else {
      setType('expense');
      setAmount('');
      setNote('');
      setDate(today());
      setSelectedCategory(null);
      const filteredAccountId = useUIStore.getState().selectedAccountId;
      setSelectedAccountId(filteredAccountId ?? accounts[0]?.id ?? null);
      categoriesDb.getByType('expense').then(setCategories);
    }
    setAttempted(false);
  }, [isOpen, transaction]);

  // Reload categories when type toggles (add mode only — in edit mode the
  // initial useEffect handles it, and subsequent type changes are intentional)
  useEffect(() => {
    if (!isOpen) return;
    categoriesDb.getByType(type).then((cats) => {
      setCategories(cats);
      // Re-select the original category if we're back on the same type in edit mode
      if (transaction && type === transaction.type) {
        setSelectedCategory(cats.find((c) => c.id === transaction.category_id) ?? null);
      } else {
        setSelectedCategory(null);
      }
    });
  }, [type]);


  const saveTransaction = useCallback(async (parsedAmount: number) => {
    if (transaction) {
      await transactionsDb.update(transaction.id, {
        amount: parsedAmount,
        type,
        category_id: selectedCategory!.id,
        account_id: selectedAccountId!,
        note: note.trim() || null,
        date,
      });
      const updated = await transactionsDb.getById(transaction.id);
      if (updated) updateTransaction(updated);
    } else {
      const result = await transactionsDb.insert({
        amount: parsedAmount,
        type,
        category_id: selectedCategory!.id,
        account_id: selectedAccountId!,
        note: note.trim() || null,
        date,
      });
      const tx = await transactionsDb.getById(result.lastInsertRowId);
      if (tx) addTransaction(tx);
    }
  }, [transaction, type, selectedCategory, selectedAccountId, note, date]);

  const handleSave = useCallback(async () => {
    setAttempted(true);
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !selectedCategory || !selectedAccountId) return;
    try {
      await saveTransaction(parsedAmount);
      Snackbar.show({ text: transaction ? 'Transaction updated' : 'Transaction saved', duration: Snackbar.LENGTH_SHORT });
      triggerCloseRef.current();
    } catch {
      setErrorModal('Failed to save transaction.');
    }
  }, [amount, selectedCategory, selectedAccountId, saveTransaction, transaction]);

  const handleSaveAndContinue = useCallback(async () => {
    setAttempted(true);
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !selectedCategory || !selectedAccountId) return;
    try {
      await saveTransaction(parsedAmount);
      Snackbar.show({ text: transaction ? 'Transaction updated' : 'Transaction saved', duration: Snackbar.LENGTH_SHORT });
      setAmount('');
      setNote('');
      setAttempted(false);
    } catch {
      setErrorModal('Failed to save transaction.');
    }
  }, [amount, selectedCategory, selectedAccountId, saveTransaction, transaction]);

  const handleCategorySaved = useCallback(async () => {
    const updatedCats = await categoriesDb.getByType(type);
    setCategories(updatedCats);
    const newCat = updatedCats.find((c) => !categories.some((existing) => existing.id === c.id));
    if (newCat) setSelectedCategory(newCat);
  }, [type, categories]);

  const { isDark, accentColor, onAccentColor, cardBg: bg, textColor, subColor: subTextColor, inputBg, borderColor } = useAppTheme();

  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Animate in on open — sheet slides in first, backdrop fades in after sheet settles
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

  // Drag handle — claims on a clear downward move so taps on the close button pass through
  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => sheetTranslateY.stopAnimation(),
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) sheetTranslateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 0.3) {
        triggerCloseRef.current();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => snapBack(),
  })).current;


  return (
    <>
    <Modal
      visible={isOpen}
      animationType="none"
      transparent
      onRequestClose={() => triggerCloseRef.current()}
    >
      <View style={styles.kvContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => triggerCloseRef.current()} accessibilityLabel="Dismiss" accessibilityRole="button" />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: sheetTranslateY }] }]}
        >
          {/* Handle pill — drag zone only, no interactive children */}
          <View {...handlePan.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} accessible={false} />
          </View>

          {/* Header — completely outside the PanResponder so close button always works */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {transaction ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <MaterialIcons name="close" size={24} color={subTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
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
                autoFocus={!transaction}
              />
            </View>
            {attempted && (!parseFloat(amount) || parseFloat(amount) <= 0) && (
              <Text style={styles.errorText}>Enter a valid amount greater than 0</Text>
            )}

            {/* Type toggle */}
            <View style={[styles.typeToggle, { backgroundColor: inputBg }]}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && { backgroundColor: '#F44336' }]}
                onPress={() => setType('expense')}
                accessibilityRole="radio"
                accessibilityState={{ selected: type === 'expense' }}
              >
                <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#fff' : subTextColor }]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'income' && { backgroundColor: '#4CAF50' }]}
                onPress={() => setType('income')}
                accessibilityRole="radio"
                accessibilityState={{ selected: type === 'income' }}
              >
                <Text style={[styles.typeBtnText, { color: type === 'income' ? '#fff' : subTextColor }]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>Category</Text>
            <ScrollView
              scrollEnabled={categories.length > 9}
              style={categories.length > 9 ? styles.categoryGridScroll : undefined}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.categoryItem}
                      onPress={() => setSelectedCategory(cat)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedCategory?.id === cat.id }}
                    >
                      <View
                        style={[
                          styles.categoryCircle,
                          { backgroundColor: cat.color },
                          isSelected && styles.categoryCircleSelected,
                        ]}
                      >
                        <MaterialIcons name={(cat.icon as any) || 'label'} size={20} color="#fff" />
                      </View>
                      <Text
                        style={[styles.categoryLabel, { color: isSelected ? textColor : subTextColor }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => setCatFormOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="New Category"
                >
                  <View style={[styles.categoryCircle, styles.newCategoryCircle, { borderColor }]}>
                    <MaterialIcons name="add" size={20} color={subTextColor} />
                  </View>
                  <Text style={[styles.categoryLabel, { color: subTextColor }]}>New</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            {attempted && !selectedCategory && (
              <Text style={styles.errorText}>Please select a category</Text>
            )}

            {/* Account */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>Account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll} contentContainerStyle={styles.accountScrollContent}>
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                const accentBg = acc.color ?? '#55A3FF';
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountCard,
                      {
                        backgroundColor: isSelected ? accentBg + '18' : inputBg,
                        borderColor: isSelected ? accentBg : borderColor,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedAccountId(acc.id)}
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

            {/* Date */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>Date</Text>
            <DatePickerField date={date} onChange={setDate} />

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
                {transaction ? 'Save Changes' : 'Save Transaction'}
              </Text>
            </TouchableOpacity>
            {!transaction && (
              <TouchableOpacity style={[styles.saveAndContinueBtn, { borderColor: accentColor }]} onPress={handleSaveAndContinue} accessibilityRole="button">
                <Text style={[styles.saveAndContinueBtnText, { color: accentColor }]}>Save & Add Another</Text>
              </TouchableOpacity>
            )}
            {transaction && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} accessibilityRole="button" accessibilityHint="Double tap to permanently delete. This cannot be undone.">
                <Text style={styles.deleteBtnText}>Delete Transaction</Text>
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
    <CategoryFormSheet
      isOpen={catFormOpen}
      category={null}
      defaultType={type}
      onClose={() => setCatFormOpen(false)}
      onSaved={handleCategorySaved}
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
  newCategoryCircle: { backgroundColor: 'transparent', borderWidth: 1.5 },
});

const styles = { ...sheetStyles, ...localStyles };
