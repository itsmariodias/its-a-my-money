import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
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
import { getColors } from '@/constants/theme';
import type { Category } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const PRESET_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#2196F3', '#03A9F4', '#009688', '#4CAF50',
  '#FF9800', '#FF5722', '#795548', '#607D8B',
];

const PRESET_ICONS: (keyof typeof MaterialIcons.glyphMap)[] = [
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
  onDelete?: () => void;
  deleteDisabled?: boolean;
}

export default function CategoryFormSheet({ isOpen, category, defaultType = 'expense', onClose, onSaved, onDelete, deleteDisabled }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useSettingsStore((s) => s.accentColor);

  const categoriesDb = useCategoriesDb();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0]);
  const [attempted, setAttempted] = useState(false);

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
    setAttempted(false);
  }, [isOpen, category]);

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim()) return;
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

  const { cardBg: bg, textColor, subColor, inputBg, borderColor } = getColors(isDark);

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
    <Modal visible={isOpen} animationType="none" transparent onRequestClose={() => triggerCloseRef.current()}>
      <View style={styles.kvContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => triggerCloseRef.current()} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: sheetTranslateY }] }]}>
          <View {...handlePan.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {category ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={subColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
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
            <Text style={[styles.label, { color: attempted && !name.trim() ? '#ef4444' : subColor }]}>
              {attempted && !name.trim() ? 'Category Name — required' : 'Category Name'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: attempted && !name.trim() ? '#ef4444' : borderColor, color: textColor }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Groceries"
              placeholderTextColor={subColor}
              returnKeyType="done"
              autoFocus={!category}
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
            {category && onDelete && (
              <TouchableOpacity
                style={[styles.deleteBtn, deleteDisabled && { opacity: 0.4 }]}
                onPress={onDelete}
                disabled={deleteDisabled}
              >
                <Text style={styles.deleteBtnText}>Delete Category</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.4)' },
  kvContainer: { flex: 1, justifyContent: 'flex-end' },
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
  deleteBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#ef444420',
  },
  deleteBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
