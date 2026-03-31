import { useEffect, useRef, useState } from 'react';
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
import { Text } from '@/shared/components/Themed';
import AccountIcon from '@/shared/components/AccountIcon';
import InfoModal from '@/shared/components/InfoModal';
import { useAccountsDb } from '@/db';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { Snackbar } from 'react-native-snackbar';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { getCurrencySymbol } from '@/constants/currencies';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import type { Account } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const PRESET_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
  '#795548', '#9E9E9E', '#607D8B',
];

const COLOR_NAMES: Record<string, string> = {
  '#F44336': 'Red',         '#E91E63': 'Pink',        '#9C27B0': 'Purple',      '#673AB7': 'Deep purple',
  '#3F51B5': 'Indigo',      '#2196F3': 'Blue',         '#03A9F4': 'Light blue',  '#00BCD4': 'Cyan',
  '#009688': 'Teal',        '#4CAF50': 'Green',        '#8BC34A': 'Light green', '#CDDC39': 'Lime',
  '#FFEB3B': 'Yellow',      '#FFC107': 'Amber',        '#FF9800': 'Orange',      '#FF5722': 'Deep orange',
  '#795548': 'Brown',       '#9E9E9E': 'Grey',         '#607D8B': 'Blue grey',
};

const PRESET_ICONS: string[] = [
  // Wallet / bank
  'account-balance-wallet',
  'account-balance',
  'credit-card',
  'savings',
  'payments',
  'currency-exchange',
  'monetization-on',
  'business-center',
  // Card brands (FontAwesome6)
  'fa6:cc-visa',
  'fa6:cc-mastercard',
  'fa6:cc-amex',
  'fa6:cc-discover',
  'fa6:paypal',
  'fa6:apple-pay',
  'fa6:google-pay',
  'fa6:cc-stripe',
];

interface Props {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}

export default function AccountFormSheet({ isOpen, account, onClose, onDelete, deleteDisabled }: Props) {
  const currencySymbol = getCurrencySymbol(useSettingsStore((s) => s.currency));

  const accountsDb = useAccountsDb();
  const setAccounts = useAccountsStore((s) => s.setAccounts);

  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0]);
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (account) {
      setName(account.name);
      setInitialBalance(String(account.initial_balance));
      setColor(account.color ?? PRESET_COLORS[0]);
      setIcon(account.icon ?? PRESET_ICONS[0]);
    } else {
      setName('');
      setInitialBalance('0');
      setColor(PRESET_COLORS[0]);
      setIcon(PRESET_ICONS[0]);
    }
    setAttempted(false);
  }, [isOpen, account]);

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim()) return;
    const balance = parseFloat(initialBalance) || 0;
    try {
      if (account) {
        await accountsDb.update(account.id, { name: name.trim(), initial_balance: balance, currency: account.currency, color, icon });
      } else {
        await accountsDb.insert({ name: name.trim(), initial_balance: balance, currency: 'USD', color, icon });
      }
      const updated = await accountsDb.getAll();
      setAccounts(updated);
      Snackbar.show({ text: account ? 'Account updated' : 'Account created', duration: Snackbar.LENGTH_SHORT });
      onClose();
    } catch {
      setErrorModal('Failed to save account.');
    }
  };

  const { accentColor, onAccentColor, cardBg: bg, textColor, subColor: subTextColor, inputBg, borderColor } = useAppTheme();

  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      sheetTranslateY.setValue(SCREEN_HEIGHT);
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
      if (g.dy > 120 || g.vy > 0.3) triggerCloseRef.current();
      else snapBack();
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

          <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: sheetTranslateY }] }]}>
            <View {...handlePan.panHandlers} style={styles.dragArea}>
              <View style={[styles.handle, { backgroundColor: borderColor }]} accessible={false} />
            </View>

            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                {account ? 'Edit Account' : 'New Account'}
              </Text>
              <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
              {/* Name */}
              <Text style={[styles.sectionLabel, { color: attempted && !name.trim() ? '#F44336' : subTextColor }]}>
                {attempted && !name.trim() ? 'Account Name — required' : 'Account Name'}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, borderColor: attempted && !name.trim() ? '#F44336' : borderColor, color: textColor }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Cash, Bank Account"
                placeholderTextColor={subTextColor}
                returnKeyType="done"
                autoFocus={!account}
              />

              {attempted && !name.trim() && (
                <Text style={styles.errorText}>Account name is required</Text>
              )}

              {/* Initial Balance */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Initial Balance</Text>
              <View style={[styles.balanceContainer, { backgroundColor: inputBg, borderColor }]}>
                <Text style={[styles.currencySymbol, { color: subTextColor }]}>{currencySymbol}</Text>
                <TextInput
                  style={[styles.amountInput, { color: textColor }]}
                  value={initialBalance}
                  onChangeText={setInitialBalance}
                  placeholder="0.00"
                  placeholderTextColor={subTextColor}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              {/* Color */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
                    hitSlop={6}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: color === c }}
                    accessibilityLabel={COLOR_NAMES[c] ?? c}
                  >
                    {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icon */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {PRESET_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    onPress={() => setIcon(ic)}
                    style={[styles.iconItem, { backgroundColor: icon === ic ? color : inputBg }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: icon === ic }}
                    accessibilityLabel={ic.replace(/fa6:/g, '').replace(/-/g, ' ')}
                  >
                    <View style={styles.iconItemInner}>
                      <AccountIcon name={ic} size={24} color={icon === ic ? '#fff' : subTextColor} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave} accessibilityRole="button">
                <Text style={[styles.saveBtnText, { color: onAccentColor }]}>{account ? 'Save Changes' : 'Create Account'}</Text>
              </TouchableOpacity>
              {account && onDelete && (
                <TouchableOpacity
                  style={[styles.deleteBtn, deleteDisabled && { opacity: 0.4 }]}
                  onPress={onDelete}
                  disabled={deleteDisabled}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to permanently delete. This cannot be undone."
                >
                  <Text style={styles.deleteBtnText}>Delete Account</Text>
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
  balanceContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, marginBottom: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  iconItem: { width: '22%', aspectRatio: 1, borderRadius: 12 },
});
const styles = { ...sheetStyles, ...localStyles };
