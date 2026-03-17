import { useEffect, useState } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useAccountsDb } from '@/db';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Account } from '@/types';

const PRESET_COLORS = [
  '#55A3FF', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#F4A261', '#DDA0DD', '#A8E063',
];

const PRESET_ICONS: (keyof typeof MaterialIcons.glyphMap)[] = [
  'account-balance-wallet',
  'account-balance',
  'credit-card',
  'savings',
  'payments',
  'currency-exchange',
  'monetization-on',
  'business-center',
];

interface Props {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
}

export default function AccountFormSheet({ isOpen, account, onClose }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useSettingsStore((s) => s.accentColor);

  const accountsDb = useAccountsDb();
  const setAccounts = useAccountsStore((s) => s.setAccounts);

  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0]);

  useEffect(() => {
    if (!isOpen) return;
    if (account) {
      setName(account.name);
      setInitialBalance(String(account.initial_balance));
      setCurrency(account.currency);
      setColor(account.color ?? PRESET_COLORS[0]);
      setIcon(account.icon ?? PRESET_ICONS[0]);
    } else {
      setName('');
      setInitialBalance('0');
      setCurrency('USD');
      setColor(PRESET_COLORS[0]);
      setIcon(PRESET_ICONS[0]);
    }
  }, [isOpen, account]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter an account name.');
      return;
    }
    const balance = parseFloat(initialBalance) || 0;
    try {
      if (account) {
        await accountsDb.update(account.id, {
          name: name.trim(),
          initial_balance: balance,
          currency: currency.trim() || 'USD',
          color,
          icon,
        });
      } else {
        await accountsDb.insert({
          name: name.trim(),
          initial_balance: balance,
          currency: currency.trim() || 'USD',
          color,
          icon,
        });
      }
      const updated = await accountsDb.getAll();
      setAccounts(updated);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save account.');
    }
  };

  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subTextColor = isDark ? '#a0a0b0' : '#6b7280';
  const inputBg = isDark ? '#0f3460' : '#f0f4f8';
  const borderColor = isDark ? '#2a3a5e' : '#e2e8f0';

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
              {account ? 'Edit Account' : 'New Account'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={subTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text style={[styles.label, { color: subTextColor }]}>Account Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cash, Bank Account"
              placeholderTextColor={subTextColor}
              returnKeyType="done"
            />

            {/* Initial Balance */}
            <Text style={[styles.label, { color: subTextColor }]}>Initial Balance</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              value={initialBalance}
              onChangeText={setInitialBalance}
              placeholder="0"
              placeholderTextColor={subTextColor}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            {/* Currency */}
            <Text style={[styles.label, { color: subTextColor }]}>Currency</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              value={currency}
              onChangeText={setCurrency}
              placeholder="USD"
              placeholderTextColor={subTextColor}
              autoCapitalize="characters"
              returnKeyType="done"
            />

            {/* Color */}
            <Text style={[styles.label, { color: subTextColor }]}>Color</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    color === c && styles.colorSwatchSelected,
                  ]}
                >
                  {color === c && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
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
                  style={[
                    styles.iconItem,
                    { backgroundColor: icon === ic ? color : inputBg },
                  ]}
                >
                  <View style={styles.iconItemInner}>
                    <MaterialIcons
                      name={ic as any}
                      size={24}
                      color={icon === ic ? '#fff' : subTextColor}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {account ? 'Save Changes' : 'Create Account'}
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  iconItem: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  iconItemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
