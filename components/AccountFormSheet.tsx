import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
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

import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import AccountIcon from '@/components/AccountIcon';
import { useAccountsDb } from '@/db';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getCurrencySymbol } from '@/constants/currencies';
import { getColors } from '@/constants/theme';
import type { Account } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const PRESET_COLORS = [
  '#2196F3', '#F44336', '#4CAF50', '#9C27B0',
  '#FF9800', '#009688', '#E91E63', '#607D8B',
];

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useSettingsStore((s) => s.accentColor);
  const currencySymbol = getCurrencySymbol(useSettingsStore((s) => s.currency));

  const accountsDb = useAccountsDb();
  const setAccounts = useAccountsStore((s) => s.setAccounts);

  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0]);
  const [attempted, setAttempted] = useState(false);

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
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save account.');
    }
  };

  const { cardBg: bg, textColor, subColor: subTextColor, inputBg, borderColor } = getColors(isDark);

  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 14 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const triggerCloseRef = useRef(() => {});
  triggerCloseRef.current = () => {
    sheetTranslateY.stopAnimation();
    backdropOpacity.stopAnimation();
    Animated.parallel([
      Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => { onCloseRef.current(); });
  };

  const snapBack = () => {
    Animated.parallel([
      Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => sheetTranslateY.stopAnimation(),
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) {
        sheetTranslateY.setValue(g.dy);
        backdropOpacity.setValue(Math.max(0, 1 - g.dy / 380));
      }
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 0.3) triggerCloseRef.current();
      else snapBack();
    },
    onPanResponderTerminate: () => snapBack(),
  })).current;

  return (
    <Modal
        visible={isOpen}
        animationType="none"
        transparent
        onRequestClose={() => triggerCloseRef.current()}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kvContainer}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={{ flex: 1 }} onPress={() => triggerCloseRef.current()} />
          </Animated.View>

          <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: sheetTranslateY }] }]}>
            <View {...handlePan.panHandlers} style={styles.dragArea}>
              <View style={[styles.handle, { backgroundColor: borderColor }]} />
            </View>

            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                {account ? 'Edit Account' : 'New Account'}
              </Text>
              <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8}>
                <MaterialIcons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {/* Name */}
              <Text style={[styles.label, { color: attempted && !name.trim() ? '#ef4444' : subTextColor }]}>
                {attempted && !name.trim() ? 'Account Name — required' : 'Account Name'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: attempted && !name.trim() ? '#ef4444' : borderColor, color: textColor }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Cash, Bank Account"
                placeholderTextColor={subTextColor}
                returnKeyType="done"
                autoFocus={!account}
              />

              {/* Initial Balance */}
              <Text style={[styles.label, { color: subTextColor }]}>Initial Balance</Text>
              <View style={[styles.balanceContainer, { backgroundColor: inputBg, borderColor }]}>
                <Text style={[styles.balanceCurrencySymbol, { color: subTextColor }]}>{currencySymbol}</Text>
                <TextInput
                  style={[styles.balanceInput, { color: textColor }]}
                  value={initialBalance}
                  onChangeText={setInitialBalance}
                  placeholder="0.00"
                  placeholderTextColor={subTextColor}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              {/* Color */}
              <Text style={[styles.label, { color: subTextColor }]}>Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
                  >
                    {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icon */}
              <Text style={[styles.label, { color: subTextColor }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {PRESET_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    onPress={() => setIcon(ic)}
                    style={[styles.iconItem, { backgroundColor: icon === ic ? color : inputBg }]}
                  >
                    <View style={styles.iconItemInner}>
                      <AccountIcon name={ic} size={24} color={icon === ic ? '#fff' : subTextColor} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{account ? 'Save Changes' : 'Create Account'}</Text>
              </TouchableOpacity>
              {account && onDelete && (
                <TouchableOpacity
                  style={[styles.deleteBtn, deleteDisabled && { opacity: 0.4 }]}
                  onPress={onDelete}
                  disabled={deleteDisabled}
                >
                  <Text style={styles.deleteBtnText}>Delete Account</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  kvContainer: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  dragArea: { paddingTop: 12, paddingBottom: 12, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  balanceContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, marginBottom: 16 },
  balanceCurrencySymbol: { fontSize: 28, fontWeight: '300', marginRight: 4 },
  balanceInput: { flex: 1, fontSize: 36, fontWeight: '600', paddingVertical: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  iconItem: { width: '22%', aspectRatio: 1, borderRadius: 12 },
  iconItemInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 8, backgroundColor: '#ef444420' },
  deleteBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
