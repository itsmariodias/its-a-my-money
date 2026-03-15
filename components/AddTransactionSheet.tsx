import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useCategoriesDb, useTransactionsDb } from '@/db';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getCurrencySymbol } from '@/constants/currencies';
import type { Category, TransactionWithDetails } from '@/types';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const today = () => toLocalDateString(new Date());

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the sheet opens in edit mode pre-filled with the transaction. */
  transaction?: TransactionWithDetails | null;
}

export default function AddTransactionSheet({ isOpen, onClose, transaction = null }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useSettingsStore((s) => s.accentColor);

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
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      setShowDatePicker(false);
      setSelectedCategory(null);
      setSelectedAccountId(accounts[0]?.id ?? null);
      categoriesDb.getByType('expense').then(setCategories);
    }
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

  const handleDateChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDate(toLocalDateString(selected));
  }, []);

  const handleSave = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('No category', 'Please select a category.');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('No account', 'Please select an account.');
      return;
    }

    try {
      if (transaction) {
        await transactionsDb.update(transaction.id, {
          amount: parsedAmount,
          type,
          category_id: selectedCategory.id,
          account_id: selectedAccountId,
          note: note.trim() || null,
          date,
        });
        const updated = await transactionsDb.getById(transaction.id);
        if (updated) updateTransaction(updated);
      } else {
        const result = await transactionsDb.insert({
          amount: parsedAmount,
          type,
          category_id: selectedCategory.id,
          account_id: selectedAccountId,
          note: note.trim() || null,
          date,
        });
        const tx = await transactionsDb.getById(result.lastInsertRowId);
        if (tx) addTransaction(tx);
      }
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save transaction.');
    }
  }, [amount, type, selectedCategory, selectedAccountId, note, date, transaction]);

  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subTextColor = isDark ? '#a0a0b0' : '#6b7280';
  const inputBg = isDark ? '#0f3460' : '#f0f4f8';
  const borderColor = isDark ? '#2a3a5e' : '#e2e8f0';

  const dateValue = new Date(date + 'T00:00:00');

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvContainer}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <View style={[styles.handle, { backgroundColor: borderColor }]} />

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {transaction ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={subTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type toggle */}
            <View style={[styles.typeToggle, { backgroundColor: inputBg }]}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && { backgroundColor: '#ef4444' }]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#fff' : subTextColor }]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'income' && { backgroundColor: '#22c55e' }]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeBtnText, { color: type === 'income' ? '#fff' : subTextColor }]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={[styles.amountContainer, { backgroundColor: inputBg, borderColor }]}>
              <Text style={[styles.currencySymbol, { color: subTextColor }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: textColor }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={subTextColor}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            {/* Category */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryItem}
                    onPress={() => setSelectedCategory(cat)}
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
            </View>

            {/* Account */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>Account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                const iconBg = acc.color ?? '#55A3FF';
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChip,
                      {
                        borderColor: isSelected ? iconBg : borderColor,
                        backgroundColor: isSelected ? iconBg + '18' : inputBg,
                      },
                    ]}
                    onPress={() => setSelectedAccountId(acc.id)}
                  >
                    <View style={[styles.accountChipIcon, { backgroundColor: iconBg }]}>
                      <MaterialIcons name={(acc.icon as any) ?? 'account-balance-wallet'} size={13} color="#fff" />
                    </View>
                    <Text style={{ color: isSelected ? iconBg : textColor, fontWeight: isSelected ? '600' : '500', fontSize: 13 }}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Note */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>Note (optional)</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor={subTextColor}
              returnKeyType="done"
            />

            {/* Date */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>Date</Text>
            <TouchableOpacity
              style={[styles.dateRow, { backgroundColor: inputBg, borderColor }]}
              onPress={() => setShowDatePicker((v) => !v)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="calendar-today" size={18} color={subTextColor} />
              <Text style={[styles.dateText, { color: textColor }]}>{formatDisplayDate(date)}</Text>
              <MaterialIcons
                name={showDatePicker && Platform.OS === 'ios' ? 'expand-less' : 'expand-more'}
                size={20}
                color={subTextColor}
              />
            </TouchableOpacity>

            {showDatePicker && Platform.OS === 'ios' && (
              <View style={[styles.datePickerCard, { backgroundColor: inputBg, borderColor }]}>
                <DateTimePicker
                  value={dateValue}
                  mode="date"
                  display="inline"
                  onChange={handleDateChange}
                  style={styles.datePicker}
                />
                <TouchableOpacity
                  style={[styles.datePickerDone, { borderTopColor: borderColor }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={{ color: accentColor, fontWeight: '600', fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {transaction ? 'Save Changes' : 'Save Transaction'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  kvContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '300',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '600',
    paddingVertical: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  categoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCircleSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  accountScroll: {
    marginBottom: 20,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  accountChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
  },
  datePickerCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  datePicker: {
    alignSelf: 'center',
  },
  datePickerDone: {
    paddingVertical: 13,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
