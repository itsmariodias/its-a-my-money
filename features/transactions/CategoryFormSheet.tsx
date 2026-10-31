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
import InfoModal from '@/shared/components/InfoModal';
import { useCategoriesDb } from '@/db';
import { useCategoriesStore } from '@/features/transactions/useCategoriesStore';
import { Snackbar } from 'react-native-snackbar';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import ColorIconPicker, { CATEGORY_ICONS, PRESET_COLORS } from '@/shared/components/ColorIconPicker';
import type { Category } from '@/types';
import SheetFooter from '@/shared/components/SheetFooter';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  isOpen: boolean;
  category: Category | null;
  defaultType?: 'expense' | 'income';
  onClose: () => void;
  /** Optional — the store is updated either way; use this only to react to the saved category. */
  onSaved?: (saved: Category) => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}

export default function CategoryFormSheet({ isOpen, category, defaultType = 'expense', onClose, onSaved, onDelete, deleteDisabled }: Props) {

  const categoriesDb = useCategoriesDb();
  const upsertCategory = useCategoriesStore((s) => s.upsertCategory);

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [attempted, setAttempted] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

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
      setIcon(CATEGORY_ICONS[0]);
    }
    setAttempted(false);
  }, [isOpen, category]);

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim()) return;
    try {
      const fields = { name: name.trim(), type, color, icon };
      let saved: Category;
      if (category) {
        await categoriesDb.update(category.id, { ...fields, is_default: category.is_default });
        saved = { ...category, ...fields };
      } else {
        const result = await categoriesDb.insert({ ...fields, is_default: 0 });
        saved = { ...fields, id: result.lastInsertRowId, is_default: 0 };
      }
      // DB first, then the store — every screen showing categories reads from it.
      upsertCategory(saved);
      Snackbar.show({ text: category ? 'Category updated' : 'Category created', duration: Snackbar.LENGTH_SHORT });
      onSaved?.(saved);
      onClose();
    } catch {
      setErrorModal('Failed to save category.');
    }
  };

  const { cardBg: bg, textColor, subColor, inputBg, borderColor } = useAppTheme();

  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  // Focused once the sheet has settled. autoFocus fires on mount, before an Android Modal's
  // window has focus, and the keyboard request is dropped.
  const focusOnOpenRef = useRef<TextInput>(null);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(1);
      Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 14, overshootClamping: true, restSpeedThreshold: 100, restDisplacementThreshold: 40 }).start(({ finished }) => { if (finished && !category) focusOnOpenRef.current?.focus(); });
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
              {category ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <MaterialIcons name="close" size={24} color={subColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
            {/* Type toggle */}
            <View style={[styles.typeToggle, { backgroundColor: inputBg }]}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && { backgroundColor: '#F44336' }]}
                onPress={() => setType('expense')}
                accessibilityRole="radio"
                accessibilityState={{ selected: type === 'expense' }}
              >
                <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#fff' : subColor }]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'income' && { backgroundColor: '#4CAF50' }]}
                onPress={() => setType('income')}
                accessibilityRole="radio"
                accessibilityState={{ selected: type === 'income' }}
              >
                <Text style={[styles.typeBtnText, { color: type === 'income' ? '#fff' : subColor }]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={[styles.sectionLabel, { color: attempted && !name.trim() ? '#F44336' : subColor }]}>
              {attempted && !name.trim() ? 'Category Name — required' : 'Category Name'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: attempted && !name.trim() ? '#F44336' : borderColor, color: textColor }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Groceries"
              placeholderTextColor={subColor}
              returnKeyType="done"
              ref={focusOnOpenRef}
            />

            {attempted && !name.trim() && (
              <Text style={styles.errorText}>Category name is required</Text>
            )}

            <ColorIconPicker
              color={color}
              icon={icon}
              onColorChange={setColor}
              onIconChange={setIcon}
              icons={CATEGORY_ICONS}
            />

            {/* Preview */}
            <Text style={[styles.sectionLabel, { color: subColor }]}>Preview</Text>
            <View style={[styles.preview, { backgroundColor: inputBg, borderColor }]}>
              <View style={[styles.previewCircle, { backgroundColor: color }]}>
                <MaterialIcons name={icon as any} size={22} color="#fff" />
              </View>
              <Text style={[styles.previewName, { color: textColor }]}>{name || 'Category Name'}</Text>
              <View style={[styles.previewBadge, { backgroundColor: type === 'expense' ? '#F4433620' : '#4CAF5020' }]}>
                <Text style={[styles.previewBadgeText, { color: type === 'expense' ? '#F44336' : '#4CAF50' }]}>
                  {type}
                </Text>
              </View>
            </View>

            {category && onDelete && (
              <TouchableOpacity
                style={[styles.deleteBtn, deleteDisabled && { opacity: 0.4 }]}
                onPress={onDelete}
                disabled={deleteDisabled}
                accessibilityRole="button"
                accessibilityHint="Double tap to permanently delete. This cannot be undone."
              >
                <Text style={styles.deleteBtnText}>Delete Category</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <SheetFooter
            primary={{ label: category ? 'Save Changes' : 'Create Category', onPress: handleSave }}
          />
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
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  previewCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  previewName: { flex: 1, fontSize: 15, fontWeight: '500' },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  previewBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
const styles = { ...sheetStyles, ...localStyles };
