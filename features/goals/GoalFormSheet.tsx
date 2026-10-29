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
import DatePickerField from '@/shared/components/DatePickerField';
import AccountCardPicker from '@/shared/components/AccountCardPicker';
import ColorIconPicker, { CATEGORY_ICONS } from '@/shared/components/ColorIconPicker';
import { useGoalsDb } from '@/db';
import { useGoalsStore } from './useGoalsStore';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { getAccountCurrency } from '@/features/accounts/currencyUtils';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useUIStore } from '@/shared/store/useUIStore';
import { formatAmount, getCurrencySymbol } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import { Snackbar } from 'react-native-snackbar';
import { requestNotificationPermission } from '@/features/backup/notifications';
import { todayString } from '@/features/recurring/dateUtils';
import GoalMoveSheet from './GoalMoveSheet';
import GoalPaceHint from './GoalPaceHint';
import { goalProgress, isActiveGoal, type GoalMoveDirection } from './goalUtils';
import { notifyGoalsReached } from '@/features/transactions/postSaveAlerts';
import type { GoalWithDetails } from '@/types';
import SheetFooter from '@/shared/components/SheetFooter';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DEFAULT_COLOR = '#009688';
const DEFAULT_ICON = 'savings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  goal?: GoalWithDetails | null;
  onDelete?: () => void;
}

export default function GoalFormSheet({ isOpen, onClose, goal = null, onDelete }: Props) {
  const goalsDb = useGoalsDb();
  const setGoals = useGoalsStore((s) => s.setGoals);
  const allGoals = useGoalsStore((s) => s.goals);
  const accounts = useAccountsStore((s) => s.accounts);
  const globalCurrency = useSettingsStore((s) => s.currency);
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [moveDirection, setMoveDirection] = useState<GoalMoveDirection | null>(null);

  // The store copy, so saved figures stay current after an Add or Release from this sheet.
  const liveGoal = goal ? allGoals.find((g) => g.id === goal.id) ?? goal : null;
  const currency = getAccountCurrency(accounts, accountId, globalCurrency);
  const currencySymbol = getCurrencySymbol(currency);
  // Money in the bucket belongs to its account; moving the goal elsewhere would strand it.
  const accountLocked = liveGoal != null && liveGoal.saved !== 0;

  useEffect(() => {
    if (!isOpen) return;
    if (goal) {
      setName(goal.name);
      setAmount(String(goal.target_amount));
      setTargetDate(goal.target_date);
      setAccountId(goal.account_id);
      setColor(goal.color);
      setIcon(goal.icon);
    } else {
      setName('');
      setAmount('');
      setTargetDate(null);
      setAccountId(useUIStore.getState().selectedAccountId ?? accounts[0]?.id ?? null);
      setColor(DEFAULT_COLOR);
      setIcon(DEFAULT_ICON);
    }
    setAttempted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, goal]);

  const validate = (): boolean => {
    const parsed = parseFloat(amount);
    return !!name.trim() && !!parsed && parsed > 0 && accountId != null;
  };

  const handleSave = useCallback(async () => {
    setAttempted(true);
    if (!validate()) return;
    const fields = {
      name: name.trim(),
      icon,
      color,
      account_id: accountId!,
      target_amount: parseFloat(amount),
      target_date: targetDate,
    };

    try {
      if (goal) {
        await goalsDb.update(goal.id, fields);
        Snackbar.show({ text: 'Goal updated', duration: Snackbar.LENGTH_SHORT });
      } else {
        await goalsDb.insert(fields);
        Snackbar.show({ text: 'Goal saved', duration: Snackbar.LENGTH_SHORT });
      }
      const prevGoals = useGoalsStore.getState().goals;
      const currGoals = await goalsDb.getAll();
      setGoals(currGoals);
      // Lowering a target to what is already saved completes the goal, so check here too.
      notifyGoalsReached(prevGoals, currGoals);
      // Best-effort: ask for notification permission so we can alert when this goal is
      // reached later. Silently ignored if denied.
      requestNotificationPermission().catch(() => {});
      triggerCloseRef.current();
    } catch {
      setErrorModal('Failed to save goal.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, icon, color, accountId, amount, targetDate, goal]);

  // Completing a goal frees its money (archived goals stop counting as reserved) but keeps the
  // goal and its history; Restore makes it count again.
  const handleToggleArchived = useCallback(async () => {
    if (!liveGoal) return;
    const archiving = isActiveGoal(liveGoal);
    try {
      await goalsDb.setArchived(liveGoal.id, archiving ? new Date().toISOString() : null);
      setGoals(await goalsDb.getAll());
      Snackbar.show({ text: archiving ? 'Goal completed' : 'Goal restored', duration: Snackbar.LENGTH_SHORT });
      triggerCloseRef.current();
    } catch {
      setErrorModal(archiving ? 'Failed to complete goal.' : 'Failed to restore goal.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGoal]);

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
  const archiveLabel = liveGoal && isActiveGoal(liveGoal) ? 'Mark as Complete' : 'Restore Goal';
  const archiveAction = liveGoal ? { label: archiveLabel, onPress: handleToggleArchived } : null;

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
                {goal ? 'Edit Goal' : 'Add Goal'}
              </Text>
              <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
              {/* Saved so far, with manual moves (edit mode) */}
              {liveGoal && (
                <View style={[localStyles.savedCard, { backgroundColor: inputBg, borderColor }]}>
                  <Text style={[localStyles.savedLabel, { color: subTextColor }]}>Saved</Text>
                  <Text style={[localStyles.savedAmount, { color: textColor }]}>
                    {formatAmount(liveGoal.saved, liveGoal.account_currency, undefined, numberFormat)}
                    <Text style={{ color: subTextColor }}> of {formatAmount(liveGoal.target_amount, liveGoal.account_currency, undefined, numberFormat)} · {Math.round(goalProgress(liveGoal).pct)}%</Text>
                  </Text>
                  <GoalPaceHint goal={liveGoal} />
                  {isActiveGoal(liveGoal) ? (
                  <View style={localStyles.moveRow}>
                    <TouchableOpacity style={[localStyles.moveBtn, { backgroundColor: accentColor }]} onPress={() => setMoveDirection('add')} accessibilityRole="button">
                      <MaterialIcons name="add" size={18} color={onAccentColor} />
                      <Text style={[localStyles.moveBtnText, { color: onAccentColor }]}>Add money</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[localStyles.moveBtn, { borderColor: accentColor, borderWidth: 1.5 }, liveGoal.saved <= 0 && { opacity: 0.4 }]}
                      onPress={() => setMoveDirection('release')}
                      disabled={liveGoal.saved <= 0}
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="remove" size={18} color={accentColor} />
                      <Text style={[localStyles.moveBtnText, { color: accentColor }]}>Release</Text>
                    </TouchableOpacity>
                  </View>
                  ) : (
                    <Text style={[localStyles.completedHint, { color: subTextColor }]}>
                      Completed — this money no longer counts as set aside. Restore the goal to keep saving.
                    </Text>
                  )}
                </View>
              )}

              {/* Name */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: attempted && !name.trim() ? '#F44336' : borderColor, color: textColor }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Japan trip"
                placeholderTextColor={subTextColor}
                returnKeyType="done"
                autoFocus={!goal}
              />
              {attempted && !name.trim() && (
                <Text style={styles.errorText}>Goal name is required</Text>
              )}

              {/* Target amount */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Target</Text>
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
                />
              </View>
              {amountInvalid && (
                <Text style={styles.errorText}>Enter a valid amount greater than 0</Text>
              )}

              {/* Account */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Account</Text>
              {accountLocked ? (
                <Text style={[localStyles.lockedHint, { color: subTextColor }]}>
                  Kept in {liveGoal!.account_name}. Release the money first to move this goal to another account.
                </Text>
              ) : (
                <AccountCardPicker accounts={accounts} selectedId={accountId} onSelect={setAccountId} />
              )}

              {/* Target date (optional) */}
              <TouchableOpacity
                style={localStyles.targetDateToggle}
                onPress={() => setTargetDate(targetDate ? null : todayString())}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: targetDate != null }}
                accessibilityLabel="Set a target date"
              >
                <Text style={[localStyles.targetDateToggleLabel, { color: subTextColor }]}>Target Date</Text>
                <View style={[localStyles.checkbox, { borderColor: targetDate ? accentColor : borderColor, backgroundColor: targetDate ? accentColor : 'transparent' }]}>
                  {targetDate && <MaterialIcons name="check" size={14} color={onAccentColor} />}
                </View>
              </TouchableOpacity>
              {targetDate && <DatePickerField date={targetDate} onChange={setTargetDate} />}

              <ColorIconPicker
                color={color}
                icon={icon}
                onColorChange={setColor}
                onIconChange={setIcon}
                icons={CATEGORY_ICONS}
              />

              {goal && onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} accessibilityRole="button">
                  <Text style={styles.deleteBtnText}>Delete Goal</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <SheetFooter
              primary={{ label: goal ? 'Save Changes' : 'Save Goal', onPress: handleSave }}
              secondary={archiveAction}
            />
          </Animated.View>
        </View>
      </Modal>

      <GoalMoveSheet
        isOpen={moveDirection != null}
        onClose={() => setMoveDirection(null)}
        goal={liveGoal}
        initialDirection={moveDirection ?? 'add'}
      />

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
  savedCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  savedLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  savedAmount: { fontSize: 18, fontWeight: '700', marginTop: 4, marginBottom: 4 },
  moveRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  moveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10, paddingVertical: 10 },
  moveBtnText: { fontSize: 14, fontWeight: '600' },
  lockedHint: { fontSize: 13, lineHeight: 18, marginBottom: 20 },
  completedHint: { fontSize: 13, lineHeight: 18 },
  targetDateToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  targetDateToggleLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

const styles = { ...sheetStyles, ...localStyles };
