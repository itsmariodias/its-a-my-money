import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Text } from '@/components/Themed';
import { useCategoriesDb, useSettingsDb, useTransactionsDb, useAccountsDb, useResetDb } from '@/db';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAccountsStore } from '@/store/useAccountsStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import CategoryFormSheet from '@/components/CategoryFormSheet';
import { CURRENCIES, NUMBER_FORMATS, getCurrencyByCode } from '@/constants/currencies';
import { ACCENT_COLORS, getColors } from '@/constants/theme';
import type { Category } from '@/types';

// ─── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({
  category, onEdit, isFirst, isLast, isDark,
}: {
  category: Category; onEdit: () => void;
  isFirst: boolean; isLast: boolean; isDark: boolean;
}) {
  const { cardBg, textColor, subColor, borderColor } = getColors(isDark);
  const br = {
    borderTopLeftRadius: isFirst ? 12 : 0, borderTopRightRadius: isFirst ? 12 : 0,
    borderBottomLeftRadius: isLast ? 12 : 0, borderBottomRightRadius: isLast ? 12 : 0,
  };
  return (
    <TouchableOpacity style={[styles.catRowInner, br, { backgroundColor: cardBg }]} onPress={onEdit} activeOpacity={0.7}>
      <View style={[styles.catCircle, { backgroundColor: category.color }]}>
        <MaterialIcons name={(category.icon as any) || 'label'} size={18} color="#fff" />
      </View>
      <Text style={[styles.catName, { color: textColor }]}>{category.name}</Text>
      {!isLast && <View style={[styles.separator, { backgroundColor: borderColor }]} />}
      <MaterialIcons name="chevron-right" size={20} color={subColor} />
    </TouchableOpacity>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteCategoryModal({
  category, txCount, onCancel, onConfirm, isDark,
}: {
  category: Category | null; txCount: number;
  onCancel: () => void; onConfirm: () => void; isDark: boolean;
}) {
  const { cardBg: bg, inputBg, textColor, subColor, borderColor } = getColors(isDark);
  return (
    <Modal visible={!!category} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel} />
      <View style={styles.modalCenter} pointerEvents="box-none">
        <View style={[styles.modalCard, { backgroundColor: bg }]}>
          <View style={styles.modalIconWrap}>
            <MaterialIcons name="delete-forever" size={32} color="#ef4444" />
          </View>
          <Text style={[styles.modalTitle, { color: textColor }]}>Delete Category?</Text>
          {category && (
            <View style={[styles.modalChip, { backgroundColor: inputBg, borderColor }]}>
              <View style={[styles.catCircle, { backgroundColor: category.color }]}>
                <MaterialIcons name={(category.icon as any) || 'label'} size={16} color="#fff" />
              </View>
              <Text style={[styles.modalChipText, { color: textColor }]}>{category.name}</Text>
            </View>
          )}
          {txCount > 0 && (
            <View style={[styles.modalWarn, { backgroundColor: isDark ? '#2d2000' : '#fffbeb' }]}>
              <MaterialIcons name="warning" size={14} color="#f59e0b" />
              <Text style={[styles.modalWarnText, { color: '#f59e0b' }]}>
                Also deletes {txCount} transaction{txCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          <View style={[styles.modalDivider, { backgroundColor: borderColor }]} />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onCancel}>
              <Text style={[styles.modalBtnCancelText, { color: subColor }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={[styles.modalBtnDivider, { backgroundColor: borderColor }]} />
            <TouchableOpacity style={styles.modalBtnDelete} onPress={onConfirm}>
              <Text style={styles.modalBtnDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { bg, cardBg, inputBg, textColor, subColor, borderColor } = getColors(isDark);

  const settingsDb = useSettingsDb();
  const categoriesDb = useCategoriesDb();
  const transactionsDb = useTransactionsDb();
  const accountsDb = useAccountsDb();
  const resetDb = useResetDb();

  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const setNumberFormat = useSettingsStore((s) => s.setNumberFormat);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [deleteCatTxCount, setDeleteCatTxCount] = useState(0);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [accentOpen, setAccentOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    const [expense, income] = await Promise.all([
      categoriesDb.getByType('expense'),
      categoriesDb.getByType('income'),
    ]);
    setExpenseCategories(expense);
    setIncomeCategories(income);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadCategories(); }, []);

  const openCurrencyPicker = () => { setCurrencySearch(''); setCurrencyPickerOpen(true); };
  const selectCurrency = async (code: string) => {
    await settingsDb.set('currency', code);
    setCurrency(code);
    setCurrencyPickerOpen(false);
  };
  const handleAccentColor = async (color: string) => {
    await settingsDb.set('accent_color', color);
    setAccentColor(color);
  };
  const handleNumberFormat = async (format: string) => {
    await settingsDb.set('number_format', format);
    setNumberFormat(format);
  };

  const filteredCurrencies = currencySearch.trim()
    ? CURRENCIES.filter((c) => {
        const q = currencySearch.toLowerCase();
        return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.includes(q);
      })
    : CURRENCIES;

  const handleDeleteCatPress = async (cat: Category) => {
    const result = await categoriesDb.countTransactions(cat.id);
    setDeleteCatTxCount(result?.n ?? 0);
    setDeletingCat(cat);
  };
  const handleDeleteCatCancel = () => { setDeletingCat(null); };
  const handleDeleteCatConfirm = async () => {
    if (!deletingCat) return;
    try {
      await transactionsDb.removeByCategory(deletingCat.id);
      await categoriesDb.remove(deletingCat.id);
    } catch { /* ignore */ }
    setDeletingCat(null);
    loadCategories();
  };

  const handleExport = async () => {
    try {
      const [accounts, categories, transactions] = await Promise.all([
        accountsDb.getAll(), categoriesDb.getAll(), transactionsDb.getAll(),
      ]);
      const data = JSON.stringify({ accounts, categories, transactions }, null, 2);
      const filename = `its-a-my-money-${new Date().toISOString().split('T')[0]}.json`;
      const file = new File(Paths.cache, filename);
      file.write(data);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Data' });
      } else {
        Alert.alert('Sharing not available', 'Your device does not support sharing files.');
      }
    } catch { Alert.alert('Export failed', 'Could not export data.'); }
  };

  const handleReset = async () => {
    try {
      await resetDb.resetAll();
      const [accs, txns] = await Promise.all([accountsDb.getAll(), transactionsDb.getAll()]);
      setAccounts(accs);
      setTransactions(txns);
      setCurrency('USD');
      await loadCategories();
      setResetModalOpen(false);
    } catch { Alert.alert('Error', 'Failed to reset app data.'); }
  };

  const displayedCategories = activeType === 'expense' ? expenseCategories : incomeCategories;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <Text style={[styles.sectionLabel, { color: subColor }]}>Preferences</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <TouchableOpacity style={styles.row} onPress={openCurrencyPicker} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialIcons name="attach-money" size={20} color={accentColor} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Currency</Text>
            <Text style={[styles.rowValue, { color: subColor }]}>{getCurrencyByCode(currency).symbol} · {currency}</Text>
            <MaterialIcons name="chevron-right" size={20} color={subColor} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <TouchableOpacity style={styles.row} onPress={() => { setAccentOpen((v) => !v); setFormatOpen(false); }} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialIcons name="palette" size={20} color={accentColor} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Accent Color</Text>
            <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
            <MaterialIcons name={accentOpen ? 'expand-less' : 'expand-more'} size={20} color={subColor} />
          </TouchableOpacity>
          {accentOpen && (
            <View style={[styles.dropdownPanel, { borderTopColor: borderColor }]}>
              <View style={styles.swatchRow}>
                {ACCENT_COLORS.map((c) => (
                  <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }]} onPress={() => handleAccentColor(c)} activeOpacity={0.8}>
                    {accentColor === c && <MaterialIcons name="check" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <TouchableOpacity style={styles.row} onPress={() => { setFormatOpen((v) => !v); setAccentOpen(false); }} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialIcons name="tag" size={20} color={accentColor} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Number Format</Text>
            <Text style={[styles.rowValue, { color: subColor }]}>{NUMBER_FORMATS.find((f) => f.id === numberFormat)?.label ?? '1,234.56'}</Text>
            <MaterialIcons name={formatOpen ? 'expand-less' : 'expand-more'} size={20} color={subColor} />
          </TouchableOpacity>
          {formatOpen && (
            <View style={[styles.dropdownPanel, { borderTopColor: borderColor }]}>
              <View style={styles.fmtRow}>
                {NUMBER_FORMATS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.fmtOption, { borderColor }, numberFormat === f.id && { backgroundColor: accentColor, borderColor: accentColor }]}
                    onPress={() => { handleNumberFormat(f.id); setFormatOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.fmtLabel, { color: numberFormat === f.id ? '#fff' : textColor }]}>{f.label}</Text>
                    <Text style={[styles.fmtDesc, { color: numberFormat === f.id ? 'rgba(255,255,255,0.75)' : subColor }]}>{f.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: subColor }]}>Data</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <TouchableOpacity style={styles.row} onPress={() => setCatModalOpen(true)} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: '#f59e0b20' }]}>
              <MaterialIcons name="label" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Manage Categories</Text>
            <MaterialIcons name="chevron-right" size={20} color={subColor} />
          </TouchableOpacity>
          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />
          <TouchableOpacity style={styles.row} onPress={handleExport} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: '#22c55e20' }]}>
              <MaterialIcons name="file-download" size={20} color="#22c55e" />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Export Data</Text>
            <Text style={[styles.rowValue, { color: subColor }]}>JSON</Text>
            <MaterialIcons name="chevron-right" size={20} color={subColor} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: '#ef4444' }]}>Danger Zone</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: '#ef444430' }]}>
          <TouchableOpacity style={styles.row} onPress={() => setResetModalOpen(true)} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: '#ef444420' }]}>
              <MaterialIcons name="restart-alt" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.rowLabel, { color: '#ef4444' }]}>Reset All Data</Text>
            <MaterialIcons name="chevron-right" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: subColor }]}>It's a My Money</Text>
          <Text style={[styles.appVersion, { color: isDark ? '#3a4a6e' : '#d1d5db' }]}>v1.0.0</Text>
          <Text style={[styles.appCredit, { color: isDark ? '#3a4a6e' : '#d1d5db' }]}>
            by @itsmariodias · vibe coded with Claude Code
          </Text>
        </View>

      </ScrollView>

      {/* Reset modal */}
      <Modal visible={resetModalOpen} animationType="fade" transparent onRequestClose={() => setResetModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setResetModalOpen(false)} />
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#ef444420' }]}>
              <MaterialIcons name="warning" size={32} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: textColor }]}>Reset All Data?</Text>
            <Text style={[styles.resetWarningText, { color: subColor }]}>
              This will permanently delete all transactions, accounts, and custom categories, and restore the app to its default state.{'\n\n'}This cannot be undone.
            </Text>
            <View style={[styles.modalDivider, { backgroundColor: borderColor }]} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setResetModalOpen(false)}>
                <Text style={[styles.modalBtnCancelText, { color: subColor }]}>Cancel</Text>
              </TouchableOpacity>
              <View style={[styles.modalBtnDivider, { backgroundColor: borderColor }]} />
              <TouchableOpacity style={styles.modalBtnDelete} onPress={handleReset}>
                <Text style={styles.modalBtnDeleteText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency picker */}
      <Modal visible={currencyPickerOpen} animationType="slide" transparent={false} onRequestClose={() => setCurrencyPickerOpen(false)}>
        <View style={[styles.fullModal, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => setCurrencyPickerOpen(false)} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={subColor} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: textColor }]}>Currency</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={[styles.currencySearch, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
            <MaterialIcons name="search" size={20} color={subColor} />
            <TextInput
              style={[styles.currencySearchInput, { color: textColor }]}
              value={currencySearch}
              onChangeText={setCurrencySearch}
              placeholder="Search currencies…"
              placeholderTextColor={subColor}
              returnKeyType="search"
              autoCorrect={false}
            />
            {currencySearch.length > 0 && (
              <TouchableOpacity onPress={() => setCurrencySearch('')} hitSlop={8}>
                <MaterialIcons name="cancel" size={18} color={subColor} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {filteredCurrencies.map((c) => {
              const isSelected = c.code === currency;
              return (
                <TouchableOpacity key={c.code} style={[styles.currencyRow, { borderBottomColor: borderColor }]} onPress={() => selectCurrency(c.code)} activeOpacity={0.7}>
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

      {/* Categories modal */}
      <Modal visible={catModalOpen} animationType="slide" transparent={false} onRequestClose={() => setCatModalOpen(false)}>
        <View style={[styles.fullModal, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => setCatModalOpen(false)} hitSlop={8}>
              <MaterialIcons name="close" size={24} color={subColor} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: textColor }]}>Categories</Text>
            <TouchableOpacity onPress={() => { setEditingCat(null); setCatFormOpen(true); }} hitSlop={8}>
              <MaterialIcons name="add" size={26} color={accentColor} />
            </TouchableOpacity>
          </View>
          <View style={[styles.typeTabs, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
            {(['expense', 'income'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeTab, activeType === t && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
                onPress={() => setActiveType(t)}
              >
                <Text style={[styles.typeTabText, { color: activeType === t ? accentColor : subColor }]}>
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView contentContainerStyle={styles.catList}>
            {displayedCategories.length === 0 ? (
              <Text style={[styles.emptyText, { color: subColor }]}>No {activeType} categories yet.</Text>
            ) : (
              displayedCategories.map((cat, idx) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  onEdit={() => { setEditingCat(cat); setCatFormOpen(true); }}
                  isFirst={idx === 0}
                  isLast={idx === displayedCategories.length - 1}
                  isDark={isDark}
                />
              ))
            )}
          </ScrollView>
        </View>
        <CategoryFormSheet
          isOpen={catFormOpen}
          category={editingCat}
          defaultType={activeType}
          onClose={() => { setCatFormOpen(false); setEditingCat(null); }}
          onSaved={loadCategories}
          onDelete={() => {
            const cat = editingCat;
            setCatFormOpen(false);
            setEditingCat(null);
            if (cat) handleDeleteCatPress(cat);
          }}
          deleteDisabled={
            editingCat
              ? (editingCat.type === 'expense' ? expenseCategories : incomeCategories).length <= 1
              : false
          }
        />
        <DeleteCategoryModal
          category={deletingCat}
          txCount={deleteCatTxCount}
          onCancel={handleDeleteCatCancel}
          onConfirm={handleDeleteCatConfirm}
          isDark={isDark}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 60 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  appInfo: { alignItems: 'center', marginTop: 12, gap: 2 },
  appName: { fontSize: 13, fontWeight: '600' },
  appVersion: { fontSize: 12 },
  appCredit: { fontSize: 11, marginTop: 2 },
  dropdownPanel: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4, paddingBottom: 4 },
  accentDot: { width: 14, height: 14, borderRadius: 7, marginRight: 2 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  fmtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  fmtOption: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  fmtLabel: { fontSize: 13, fontWeight: '600' },
  fmtDesc: { fontSize: 11, marginTop: 2 },
  currencySearch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  currencySearchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  currencySymbolBadge: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  currencySymbolText: { fontSize: 16, fontWeight: '700' },
  currencyInfo: { flex: 1 },
  currencyCode: { fontSize: 15, fontWeight: '600' },
  currencyName: { fontSize: 12, marginTop: 1 },
  fullModal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalHeaderTitle: { fontSize: 17, fontWeight: '700' },
  typeTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  typeTab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  typeTabText: { fontSize: 14, fontWeight: '600' },
  catList: { padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  catRowInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12, marginBottom: 1 },
  catCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catName: { flex: 1, fontSize: 15, fontWeight: '500' },
  separator: { position: 'absolute', bottom: 0, left: 64, right: 0, height: StyleSheet.hairlineWidth },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalCard: { width: '100%', borderRadius: 20, overflow: 'hidden', paddingTop: 28, paddingHorizontal: 24 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  resetWarningText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  modalChipText: { fontSize: 14, fontWeight: '500' },
  modalWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, marginBottom: 16 },
  modalWarnText: { fontSize: 13, fontWeight: '500' },
  modalDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: -24 },
  modalBtns: { flexDirection: 'row' },
  modalBtnCancel: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  modalBtnCancelText: { fontSize: 15, fontWeight: '500' },
  modalBtnDivider: { width: StyleSheet.hairlineWidth },
  modalBtnDelete: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  modalBtnDeleteText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
