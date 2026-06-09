import { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { CURRENCIES } from '@/constants/currencies';

interface Props {
  visible: boolean;
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function CurrencyPicker({ visible, selectedCode, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { accentColor, bg, cardBg, textColor, subColor, borderColor, inputBg } = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (code: string) => {
    onSelect(code);
    setSearch('');
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={[styles.fullModal, { backgroundColor: bg }]}>
        <View style={[styles.modalHeader, { backgroundColor: cardBg, borderBottomColor: borderColor, paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={handleClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <MaterialIcons name="close" size={24} color={subColor} />
          </TouchableOpacity>
          <Text style={[styles.modalHeaderTitle, { color: textColor }]}>Currency</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.currencySearch, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
          <MaterialIcons name="search" size={20} color={subColor} />
          <TextInput
            style={[styles.currencySearchInput, { color: textColor }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search currencies…"
            placeholderTextColor={subColor}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <MaterialIcons name="cancel" size={18} color={subColor} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          {filtered.map((c) => {
            const isSelected = c.code === selectedCode;
            return (
              <TouchableOpacity
                key={c.code}
                style={[styles.currencyRow, { borderBottomColor: borderColor }]}
                onPress={() => handleSelect(c.code)}
                activeOpacity={0.7}
              >
                <View style={[styles.currencySymbolBadge, { backgroundColor: isSelected ? accentColor + '20' : inputBg }]}>
                  <Text style={[styles.currencySymbolText, { color: isSelected ? accentColor : textColor }]}>{c.symbol}</Text>
                </View>
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencyCode, { color: isSelected ? accentColor : textColor }]}>{c.code}</Text>
                  <Text style={[styles.currencyName, { color: subColor }]}>{c.name}</Text>
                </View>
                {isSelected && <MaterialIcons name="check" size={20} color={accentColor} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullModal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700' },
  currencySearch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  currencySearchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  currencySymbolBadge: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  currencySymbolText: { fontSize: 16, fontWeight: '700' },
  currencyInfo: { flex: 1 },
  currencyCode: { fontSize: 15, fontWeight: '600' },
  currencyName: { fontSize: 12, marginTop: 1 },
});
