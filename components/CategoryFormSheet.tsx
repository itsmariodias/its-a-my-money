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
import { useCategoriesDb } from '@/db';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Category } from '@/types';

const PRESET_COLORS = [
  '#FF6B6B', '#FF9F43', '#FFEAA7', '#55A3FF',
  '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD',
  '#98D8C8', '#FF6B9D', '#48DBFB', '#B0B0B0',
];

const PRESET_ICONS: Array<keyof typeof MaterialIcons.glyphMap> = [
  'restaurant', 'directions-car', 'shopping-cart', 'movie',
  'local-hospital', 'receipt', 'home', 'flight',
  'fitness-center', 'local-cafe', 'school', 'pets',
  'phone-android', 'local-gas-station', 'sports-esports', 'work',
  'laptop', 'trending-up', 'card-giftcard', 'savings',
  'attach-money', 'business-center', 'more-horiz', 'label',
];

interface Props {
  isOpen: boolean;
  category: Category | null;
  defaultType?: 'expense' | 'income';
  onClose: () => void;
  onSaved: () => void;
}

export default function CategoryFormSheet({ isOpen, category, defaultType = 'expense', onClose, onSaved }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useSettingsStore((s) => s.accentColor);

  const categoriesDb = useCategoriesDb();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0]);

  useEffect(() => {
    if (!isOpen) return;
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
      setIcon(category.icon);
    } else {
      setName('');
      setType(defaultType);
      setColor(PRESET_COLORS[0]);
      setIcon(PRESET_ICONS[0]);
    }
  }, [isOpen, category]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a category name.');
      return;
    }
    try {
      if (category) {
        await categoriesDb.update(category.id, { name: name.trim(), type, color, icon, is_default: category.is_default });
      } else {
        await categoriesDb.insert({ name: name.trim(), type, color, icon, is_default: 0 });
      }
      onSaved();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save category.');
    }
  };

  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subColor = isDark ? '#a0a0b0' : '#6b7280';
  const inputBg = isDark ? '#0f3460' : '#f0f4f8';
  const borderColor = isDark ? '#2a3a5e' : '#e2e8f0';

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
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
              {category ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={subColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type toggle */}
            <View style={[styles.typeToggle, { backgroundColor: inputBg }]}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && { backgroundColor: '#ef4444' }]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#fff' : subColor }]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'income' && { backgroundColor: '#22c55e' }]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeBtnText, { color: type === 'income' ? '#fff' : subColor }]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={[styles.label, { color: subColor }]}>Category Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Groceries"
              placeholderTextColor={subColor}
              returnKeyType="done"
            />

            {/* Color */}
            <Text style={[styles.label, { color: subColor }]}>Color</Text>
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
            <Text style={[styles.label, { color: subColor }]}>Icon</Text>
            <View style={styles.iconGrid}>
              {PRESET_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconItem, { backgroundColor: icon === ic ? color : inputBg }]}
                  onPress={() => setIcon(ic)}
                >
                  <View style={styles.iconItemInner}>
                    <MaterialIcons name={ic as any} size={22} color={icon === ic ? '#fff' : subColor} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <Text style={[styles.label, { color: subColor }]}>Preview</Text>
            <View style={[styles.preview, { backgroundColor: inputBg, borderColor }]}>
              <View style={[styles.previewCircle, { backgroundColor: color }]}>
                <MaterialIcons name={icon as any} size={22} color="#fff" />
              </View>
              <Text style={[styles.previewName, { color: textColor }]}>{name || 'Category Name'}</Text>
              <View style={[styles.previewBadge, { backgroundColor: type === 'expense' ? '#ef444420' : '#22c55e20' }]}>
                <Text style={[styles.previewBadgeText, { color: type === 'expense' ? '#ef4444' : '#22c55e' }]}>
                  {type}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{category ? 'Save Changes' : 'Create Category'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  kvContainer: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  typeToggle: { flexDirection: 'row', borderRadius: 10, padding: 4, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  typeBtnText: { fontWeight: '600', fontSize: 14 },
  label: {
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconItem: { width: '11%', aspectRatio: 1, borderRadius: 10 },
  iconItemInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20,
  },
  previewCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  previewName: { flex: 1, fontSize: 15, fontWeight: '500' },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  previewBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
