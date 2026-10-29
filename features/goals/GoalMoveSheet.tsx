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
import { Snackbar } from 'react-native-snackbar';
import InfoModal from '@/shared/components/InfoModal';
import { Text } from '@/shared/components/Themed';
import DatePickerField from '@/shared/components/DatePickerField';
import { useGoalsDb } from '@/db';
import { useGoalsStore } from './useGoalsStore';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { notifyGoalsReached } from '@/features/transactions/postSaveAlerts';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount, getCurrencySymbol } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import { todayString } from '@/features/recurring/dateUtils';
import { moveError, type GoalMoveDirection } from './goalUtils';
import { useAvailableBalances } from './useAvailableBalances';
import type { GoalWithDetails } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalWithDetails | null;
  initialDirection: GoalMoveDirection;
}

/**
 * Moves money between a goal and the rest of its account by hand: Add reserves part of the
 * account's available balance, Release puts money from the goal back. No transaction is created —
 * the account balance does not change, only how much of it is set aside.
 */
export default function GoalMoveSheet({ isOpen, onClose, goal, initialDirection }: Props) {
  const goalsDb = useGoalsDb();
  const goals = useGoalsStore((s) => s.goals);
  const setGoals = useGoalsStore((s) => s.setGoals);
  const accounts = useAccountsStore((s) => s.accounts);
  const availableByAccount = useAvailableBalances();
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  const [direction, setDirection] = useState<GoalMoveDirection>(initialDirection);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDirection(initialDirection);
    setAmount('');
    setDate(todayString());
    setNote('');
    setAttempted(false);
  }, [isOpen, initialDirection]);

  // Read the goal from the store so the figures stay current after a move.
  const liveGoal = goals.find((g) => g.id === goal?.id) ?? goal;
  const account = accounts.find((a) => a.id === liveGoal?.account_id);
  const currency = liveGoal?.account_currency ?? '';

  const available = account ? availableByAccount[account.id] ?? 0 : 0;

  const parsed = parseFloat(amount) || 0;
  const amountError = attempted && parsed <= 0 ? 'Enter a valid amount greater than 0' : null;
  const limitError = liveGoal && parsed > 0 ? moveError(direction, parsed, liveGoal.saved, available) : null;

  const handleSave = useCallback(async () => {
    setAttempted(true);
    if (!liveGoal || parsed <= 0 || limitError) return;
    try {
      const prevGoals = useGoalsStore.getState().goals;
      await goalsDb.allocate(liveGoal.id, direction === 'add' ? parsed : -parsed, date, note.trim() || null);
      const currGoals = await goalsDb.getAll();
      setGoals(currGoals);
      notifyGoalsReached(prevGoals, currGoals);
      Snackbar.show({ text: direction === 'add' ? 'Added to goal' : 'Released from goal', duration: Snackbar.LENGTH_SHORT });
      triggerCloseRef.current();
    } catch {
      setErrorModal('Failed to move money.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGoal, parsed, limitError, direction, date, note]);

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

  const error = amountError ?? limitError;
  const limitLabel = direction === 'add'
    ? `Available in ${account?.name ?? 'account'}: ${formatAmount(available, currency, undefined, numberFormat)}`
    : `In this goal: ${formatAmount(liveGoal?.saved ?? 0, currency, undefined, numberFormat)}`;

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
              <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                {liveGoal?.name ?? 'Goal'}
              </Text>
              <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
              {/* Amount */}
              <View style={[styles.amountContainer, { backgroundColor: inputBg, borderColor: attempted && error ? '#F44336' : borderColor }]}>
                <Text style={[styles.currencySymbol, { color: subTextColor }]}>{getCurrencySymbol(currency)}</Text>
                <TextInput
                  style={[styles.amountInput, { color: textColor }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={subTextColor}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  autoFocus
                />
              </View>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <Text style={[localStyles.hint, { color: subTextColor }]}>{limitLabel}</Text>
              )}

              {/* Direction */}
              <View style={[styles.typeToggle, { backgroundColor: inputBg }]}>
                <TouchableOpacity
                  style={[styles.typeBtn, direction === 'add' && { backgroundColor: accentColor }]}
                  onPress={() => setDirection('add')}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: direction === 'add' }}
                >
                  <Text style={[styles.typeBtnText, { color: direction === 'add' ? onAccentColor : subTextColor }]}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, direction === 'release' && { backgroundColor: accentColor }]}
                  onPress={() => setDirection('release')}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: direction === 'release' }}
                >
                  <Text style={[styles.typeBtnText, { color: direction === 'release' ? onAccentColor : subTextColor }]}>Release</Text>
                </TouchableOpacity>
              </View>

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
                  {direction === 'add' ? 'Add to Goal' : 'Release from Goal'}
                </Text>
              </TouchableOpacity>
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
  hint: { fontSize: 12, marginTop: -8, marginBottom: 16 },
});

const styles = { ...sheetStyles, ...localStyles };
