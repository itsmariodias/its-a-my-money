import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
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
import AccountIcon from '@/components/AccountIcon';
import { useTransfersDb } from '@/db';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useTransfersStore } from '@/store/useTransfersStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getCurrencySymbol } from '@/constants/currencies';
import { getColors } from '@/constants/theme';
import type { TransferWithDetails } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
  transfer?: TransferWithDetails | null;
  onDelete?: () => void;
}

export default function TransferSheet({ isOpen, onClose, transfer = null, onDelete }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useSettingsStore((s) => s.accentColor);

  const accounts = useAccountsStore((s) => s.accounts);
  const addTransfer = useTransfersStore((s) => s.addTransfer);
  const updateTransfer = useTransfersStore((s) => s.updateTransfer);
  const currencySymbol = getCurrencySymbol(useSettingsStore((s) => s.currency));

  const transfersDb = useTransfersDb();

  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (transfer) {
      setAmount(String(transfer.amount));
      setFromAccountId(transfer.from_account_id);
      setToAccountId(transfer.to_account_id);
      setNote(transfer.note ?? '');
      setDate(transfer.date);
    } else {
      setAmount('');
      setFromAccountId(accounts[0]?.id ?? null);
      setToAccountId(accounts.length > 1 ? accounts[1]?.id ?? null : null);
      setNote('');
      setDate(today());
      setShowDatePicker(false);
    }
    setAttempted(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transfer]);

  const handleDateChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDate(toLocalDateString(selected));
  }, []);

  const isSameAccount = fromAccountId !== null && fromAccountId === toAccountId;

  const saveTransfer = useCallback(async (parsedAmount: number) => {
    if (transfer) {
      await transfersDb.update(transfer.id, {
        amount: parsedAmount,
        from_account_id: fromAccountId!,
        to_account_id: toAccountId!,
        note: note.trim() || null,
        date,
      });
      const updated = await transfersDb.getById(transfer.id);
      if (updated) updateTransfer(updated);
    } else {
      const result = await transfersDb.insert({
        amount: parsedAmount,
        from_account_id: fromAccountId!,
        to_account_id: toAccountId!,
        note: note.trim() || null,
        date,
      });
      const t = await transfersDb.getById(result.lastInsertRowId);
      if (t) addTransfer(t);
    }
  }, [transfer, fromAccountId, toAccountId, note, date, transfersDb, updateTransfer, addTransfer]);

  const handleSave = useCallback(async () => {
    setAttempted(true);
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !fromAccountId || !toAccountId || isSameAccount) return;
    try {
      await saveTransfer(parsedAmount);
      triggerCloseRef.current();
    } catch {
      Alert.alert('Error', 'Failed to save transfer.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, fromAccountId, toAccountId, isSameAccount, saveTransfer]);

  const handleSaveAndContinue = useCallback(async () => {
    setAttempted(true);
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !fromAccountId || !toAccountId || isSameAccount) return;
    try {
      await saveTransfer(parsedAmount);
      setAmount('');
      setNote('');
      setAttempted(false);
    } catch {
      Alert.alert('Error', 'Failed to save transfer.');
    }
  }, [amount, fromAccountId, toAccountId, isSameAccount, saveTransfer]);

  const { cardBg: bg, textColor, subColor: subTextColor, inputBg, borderColor } = getColors(isDark);

  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      sheetTranslateY.setValue(600);
      backdropOpacity.setValue(1);
      Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 14 }).start();
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
    Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

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

  const dateValue = new Date(date + 'T00:00:00');

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      transparent
      onRequestClose={() => triggerCloseRef.current()}
    >
      <View style={styles.kvContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => triggerCloseRef.current()} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: sheetTranslateY }] }]}
        >
          <View {...handlePan.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {transfer ? 'Edit Transfer' : 'New Transfer'}
            </Text>
            <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8}>
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
            <View style={[styles.amountContainer, { backgroundColor: inputBg, borderColor: attempted && (!parseFloat(amount) || parseFloat(amount) <= 0) ? '#ef4444' : borderColor }]}>
              <Text style={[styles.currencySymbol, { color: subTextColor }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: textColor }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={subTextColor}
                keyboardType="decimal-pad"
                returnKeyType="done"
                autoFocus={!transfer}
              />
            </View>

            {/* From account */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>From</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll} contentContainerStyle={styles.accountScrollContent}>
              {accounts.map((acc) => {
                const isSelected = fromAccountId === acc.id;
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
                    onPress={() => setFromAccountId(acc.id)}
                    activeOpacity={0.7}
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

            {/* To account */}
            <Text style={[styles.sectionLabel, { color: attempted && isSameAccount ? '#ef4444' : subTextColor }]}>
              {attempted && isSameAccount ? 'To — must differ from From' : 'To'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll} contentContainerStyle={styles.accountScrollContent}>
              {accounts.map((acc) => {
                const isSelected = toAccountId === acc.id;
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
                    onPress={() => setToAccountId(acc.id)}
                    activeOpacity={0.7}
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

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {transfer ? 'Save Changes' : 'Save Transfer'}
              </Text>
            </TouchableOpacity>
            {!transfer && (
              <TouchableOpacity style={[styles.saveAndContinueBtn, { borderColor: accentColor }]} onPress={handleSaveAndContinue}>
                <Text style={[styles.saveAndContinueBtnText, { color: accentColor }]}>Save & Add Another</Text>
              </TouchableOpacity>
            )}
            {transfer && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Text style={styles.deleteBtnText}>Delete Transfer</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
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
  dragArea: {
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
    marginBottom: 8,
  },
  accountScroll: {
    marginBottom: 20,
  },
  accountScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  accountCard: {
    width: 100,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    position: 'relative',
  },
  accountCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  accountCardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountCardCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
  noteInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
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
  saveAndContinueBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  saveAndContinueBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#ef444420',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
