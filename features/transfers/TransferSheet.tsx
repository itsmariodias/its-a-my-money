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
import { useTransfersDb } from '@/db';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useUIStore } from '@/shared/store/useUIStore';
import { getCurrencySymbol } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import type { TransferWithDetails } from '@/types';

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
  transfer?: TransferWithDetails | null;
  onDelete?: () => void;
}

export default function TransferSheet({ isOpen, onClose, transfer = null, onDelete }: Props) {
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
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

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
      const filteredAccountId = useUIStore.getState().selectedAccountId;
      const defaultFromId = filteredAccountId ?? accounts[0]?.id ?? null;
      setFromAccountId(defaultFromId);
      setToAccountId(accounts.find((a) => a.id !== defaultFromId)?.id ?? null);
      setNote('');
      setDate(today());
    }
    setAttempted(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transfer]);


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
    if (!parsedAmount || parsedAmount <= 0 || !fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    try {
      await saveTransfer(parsedAmount);
      triggerCloseRef.current();
    } catch {
      setErrorModal('Failed to save transfer.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, fromAccountId, toAccountId, saveTransfer]);

  const handleSaveAndContinue = useCallback(async () => {
    setAttempted(true);
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    try {
      await saveTransfer(parsedAmount);
      setAmount('');
      setNote('');
      setAttempted(false);
    } catch {
      setErrorModal('Failed to save transfer.');
    }
  }, [amount, fromAccountId, toAccountId, saveTransfer]);

  const { isDark, cardBg: bg, textColor, subColor: subTextColor, inputBg, borderColor } = useAppTheme();

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
          <View {...handlePan.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} accessible={false} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {transfer ? 'Edit Transfer' : 'New Transfer'}
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
            {attempted && (!parseFloat(amount) || parseFloat(amount) <= 0) && (
              <Text style={styles.errorText}>Enter a valid amount greater than 0</Text>
            )}

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
                    onPress={() => {
                      if (acc.id === toAccountId) {
                        setToAccountId(fromAccountId);
                        setFromAccountId(acc.id);
                      } else {
                        setFromAccountId(acc.id);
                      }
                    }}
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

            {/* To account */}
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>To</Text>
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
                    onPress={() => {
                      if (acc.id === fromAccountId) {
                        setFromAccountId(toAccountId);
                        setToAccountId(acc.id);
                      } else {
                        setToAccountId(acc.id);
                      }
                    }}
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
            {attempted && fromAccountId === toAccountId && (
              <Text style={styles.errorText}>From and To accounts must be different</Text>
            )}

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
              <Text style={styles.saveBtnText}>
                {transfer ? 'Save Changes' : 'Save Transfer'}
              </Text>
            </TouchableOpacity>
            {!transfer && (
              <TouchableOpacity style={[styles.saveAndContinueBtn, { borderColor: accentColor }]} onPress={handleSaveAndContinue} accessibilityRole="button">
                <Text style={[styles.saveAndContinueBtnText, { color: accentColor }]}>Save & Add Another</Text>
              </TouchableOpacity>
            )}
            {transfer && onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} accessibilityRole="button" accessibilityHint="Double tap to permanently delete. This cannot be undone.">
                <Text style={styles.deleteBtnText}>Delete Transfer</Text>
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
      iconColor="#ef4444"
      title="Error"
      message={errorModal ?? ''}
    />
    </>
  );
}

const styles = sheetStyles;
