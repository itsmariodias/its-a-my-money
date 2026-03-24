import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSQLiteContext } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as LegacyFS from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { Text } from '@/shared/components/Themed';
import InfoModal from '@/shared/components/InfoModal';
import { useCategoriesDb, useSettingsDb, useTransactionsDb, useAccountsDb, useResetDb, useTransfersDb, useImportDb } from '@/db';
import type { ExportData } from '@/db';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import CategoryFormSheet from '@/features/transactions/CategoryFormSheet';
import { CURRENCIES, NUMBER_FORMATS, getCurrencyByCode } from '@/constants/currencies';
import { ACCENT_COLORS, THEMES } from '@/constants/theme';
import type { ThemeId } from '@/constants/theme';
import { useAppTheme } from '@/shared/components/useAppTheme';
import Constants from 'expo-constants';
import type { Category } from '@/types';
import { isValidExport } from './validation';
import { parseMonefyCsv, convertMonefyToExportData } from './monefy';
import { generateExportJson } from './exportData';
import GoogleDriveSection from '@/features/backup/GoogleDriveSection';
import { useUIStore } from '@/shared/store/useUIStore';

// ─── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({
  category, onEdit, isFirst, isLast,
}: {
  category: Category; onEdit: () => void;
  isFirst: boolean; isLast: boolean;
}) {
  const { cardBg, textColor, subColor, borderColor } = useAppTheme();
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
  category, txCount, onCancel, onConfirm,
}: {
  category: Category | null; txCount: number;
  onCancel: () => void; onConfirm: () => void;
}) {
  const { isDark, cardBg: bg, inputBg, textColor, subColor, borderColor } = useAppTheme();
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
  const { isDark, bg, cardBg, inputBg, textColor, subColor, borderColor } = useAppTheme();

  const db = useSQLiteContext();
  const settingsDb = useSettingsDb();
  const categoriesDb = useCategoriesDb();
  const transactionsDb = useTransactionsDb();
  const accountsDb = useAccountsDb();
  const resetDb = useResetDb();
  const transfersDb = useTransfersDb();
  const importDb = useImportDb();

  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const themeId = useSettingsStore((s) => s.themeId);
  const setThemeId = useSettingsStore((s) => s.setThemeId);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const setNumberFormat = useSettingsStore((s) => s.setNumberFormat);
  const biometricLock = useSettingsStore((s) => s.biometricLock);
  const setBiometricLock = useSettingsStore((s) => s.setBiometricLock);
  const setAccounts = useAccountsStore((s) => s.setAccounts);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const setTransfers = useTransfersStore((s) => s.setTransfers);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [importConfirmData, setImportConfirmData] = useState<ExportData | null>(null);
  const [importRestoreSettings, setImportRestoreSettings] = useState(true);
  const [infoModal, setInfoModal] = useState<{ icon: string; iconColor: string; title: string; message: string } | null>(null);
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
  const [themeOpen, setThemeOpen] = useState(false);
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
  const handleThemeChange = async (id: ThemeId) => {
    await settingsDb.set('theme_id', id);
    setThemeId(id);
  };
  const handleNumberFormat = async (format: string) => {
    await settingsDb.set('number_format', format);
    setNumberFormat(format);
  };

  const handleBiometricToggle = async () => {
    if (!biometricLock) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setInfoModal({ icon: 'fingerprint', iconColor: '#ef4444', title: 'Not Available', message: 'Your device does not support biometric authentication.' });
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setInfoModal({ icon: 'fingerprint', iconColor: '#f59e0b', title: 'Not Set Up', message: 'No biometrics enrolled on this device. Set up fingerprint or face recognition in your device settings first.' });
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Verify to enable biometric lock', disableDeviceFallback: false });
      if (!result.success) return;
    }
    const newValue = !biometricLock;
    await settingsDb.set('biometric_lock', String(newValue));
    setBiometricLock(newValue);
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
      const data = await generateExportJson(db);
      const filename = `its-a-my-money-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'android') {
        const safDirToPath = (uri: string) => {
          const decoded = decodeURIComponent(uri);
          const match = decoded.match(/tree\/primary:(.*)$/);
          return match ? match[1] : decoded.replace(/^content:\/\/.*\/tree\//, '');
        };

        const writeToDirectory = async (dirUri: string): Promise<boolean> => {
          try {
            const fileUri = await StorageAccessFramework.createFileAsync(dirUri, filename, 'application/json');
            await StorageAccessFramework.writeAsStringAsync(fileUri, data, { encoding: LegacyFS.EncodingType.UTF8 });
            return true;
          } catch {
            return false;
          }
        };

        const showSuccess = (dirUri: string) => {
          const folder = safDirToPath(dirUri);
          setInfoModal({ icon: 'check-circle', iconColor: '#22c55e', title: 'Export Successful', message: `Saved to ${folder}/${filename}` });
        };

        // Try cached directory first
        const cached = await settingsDb.get('export_directory_uri');
        if (cached?.value) {
          const ok = await writeToDirectory(cached.value);
          if (ok) { showSuccess(cached.value); return; }
          // Permission revoked — fall through to re-request
        }

        // Ask user to pick a directory
        useUIStore.getState().setExternalActivityActive(true);
        const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perm.granted) return;

        await settingsDb.set('export_directory_uri', perm.directoryUri);
        const ok = await writeToDirectory(perm.directoryUri);
        if (ok) {
          showSuccess(perm.directoryUri);
        } else {
          setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Export Failed', message: 'Could not save file to the selected folder.' });
        }
      } else {
        const fileUri = `${LegacyFS.cacheDirectory}${filename}`;
        await LegacyFS.writeAsStringAsync(fileUri, data, { encoding: LegacyFS.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          useUIStore.getState().setExternalActivityActive(true);
          await Sharing.shareAsync(fileUri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save backup' });
        } else {
          setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Sharing Unavailable', message: 'Your device does not support sharing files.' });
        }
      }
    } catch {
      useUIStore.getState().setExternalActivityActive(false);
      setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Export Failed', message: 'Could not export data.' });
    }
  };

  const handleImport = async () => {
    try {
      useUIStore.getState().setExternalActivityActive(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'public.json'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const text = await LegacyFS.readAsStringAsync(result.assets[0].uri);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Invalid File', message: 'The selected file is not valid JSON.' });
        return;
      }

      if (!isValidExport(parsed)) {
        setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Invalid Backup', message: 'The file does not appear to be a valid Its a My Money backup.' });
        return;
      }

      setImportRestoreSettings(true);
      setImportConfirmData(parsed);
    } catch {
      useUIStore.getState().setExternalActivityActive(false);
      setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Import Failed', message: 'Could not read the selected file.' });
    }
  };

  const handleMonefyImport = async () => {
    try {
      useUIStore.getState().setExternalActivityActive(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const text = await LegacyFS.readAsStringAsync(result.assets[0].uri);
      const records = parseMonefyCsv(text);

      if (records.length === 0) {
        setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Invalid File', message: 'No records found in the Monefy CSV.' });
        return;
      }

      const exportData = convertMonefyToExportData(records);
      setImportRestoreSettings(false);
      setImportConfirmData(exportData);
    } catch {
      useUIStore.getState().setExternalActivityActive(false);
      setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Import Failed', message: 'Could not read the Monefy CSV file.' });
    }
  };

  const doImport = async (data: ExportData) => {
    setImportConfirmData(null);
    try {
      await importDb.importAll(data);
      const [accs, txns, trfs] = await Promise.all([
        accountsDb.getAll(),
        transactionsDb.getAll(),
        transfersDb.getAll(),
      ]);
      setAccounts(accs);
      setTransactions(txns);
      setTransfers(trfs);
      if (importRestoreSettings && data.settings) {
        if (data.settings.currency) { await settingsDb.set('currency', data.settings.currency); setCurrency(data.settings.currency); }
        if (data.settings.accent_color) { await settingsDb.set('accent_color', data.settings.accent_color); setAccentColor(data.settings.accent_color); }
        if (data.settings.number_format) { await settingsDb.set('number_format', data.settings.number_format); setNumberFormat(data.settings.number_format); }
        if (data.settings.biometric_lock) { await settingsDb.set('biometric_lock', data.settings.biometric_lock); setBiometricLock(data.settings.biometric_lock === 'true'); }
        if (data.settings.theme_id) { await settingsDb.set('theme_id', data.settings.theme_id); setThemeId(data.settings.theme_id as ThemeId); }
      }
      await loadCategories();
      setInfoModal({ icon: 'check-circle', iconColor: '#22c55e', title: 'Import Successful', message: 'Your data has been restored.' });
    } catch {
      setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Import Failed', message: 'Could not import the backup.' });
    }
  };

  const handleReset = async () => {
    try {
      await resetDb.resetAll();
      const [accs, txns] = await Promise.all([accountsDb.getAll(), transactionsDb.getAll()]);
      setAccounts(accs);
      setTransactions(txns);
      setCurrency('USD');
      setAccentColor('#2f95dc');
      setNumberFormat('en-US');
      setBiometricLock(false);
      await loadCategories();
      setResetModalOpen(false);
      setInfoModal({ icon: 'check-circle', iconColor: '#22c55e', title: 'Reset Successful', message: 'All data has been cleared and the app restored to its default state.' });
    } catch { setInfoModal({ icon: 'error', iconColor: '#ef4444', title: 'Error', message: 'Failed to reset app data.' }); }
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

          <TouchableOpacity style={styles.row} onPress={() => { setAccentOpen((v) => !v); setFormatOpen(false); setThemeOpen(false); }} activeOpacity={0.7}>
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

          <TouchableOpacity style={styles.row} onPress={() => { setThemeOpen((v) => !v); setAccentOpen(false); setFormatOpen(false); }} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialIcons name="brightness-medium" size={20} color={accentColor} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Theme</Text>
            <Text style={[styles.rowValue, { color: subColor }]}>{THEMES[themeId].label}</Text>
            <MaterialIcons name={themeOpen ? 'expand-less' : 'expand-more'} size={20} color={subColor} />
          </TouchableOpacity>
          {themeOpen && (
            <View style={[styles.dropdownPanel, { borderTopColor: borderColor }]}>
              <View style={styles.themeGrid}>
                {(Object.values(THEMES) as typeof THEMES[ThemeId][]).map((t) => {
                  const isSelected = themeId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.themeCard, { borderColor: isSelected ? accentColor : borderColor, borderWidth: isSelected ? 2 : 1 }]}
                      onPress={() => handleThemeChange(t.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.themePreview, { backgroundColor: t.colors.bg }]}>
                        <View style={[styles.themePreviewCard, { backgroundColor: t.colors.cardBg }]} />
                      </View>
                      <Text style={[styles.themeLabel, { color: isSelected ? accentColor : subColor }]}>{t.label}</Text>
                      {isSelected && (
                        <View style={[styles.themeCheck, { backgroundColor: accentColor }]}>
                          <MaterialIcons name="check" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <TouchableOpacity style={styles.row} onPress={() => { setFormatOpen((v) => !v); setAccentOpen(false); setThemeOpen(false); }} activeOpacity={0.7}>
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

          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />

          <TouchableOpacity style={styles.row} onPress={handleBiometricToggle} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: accentColor + '20' }]}>
              <MaterialIcons name="fingerprint" size={20} color={accentColor} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Biometric Lock</Text>
            <MaterialIcons
              name={biometricLock ? 'toggle-on' : 'toggle-off'}
              size={36}
              color={biometricLock ? accentColor : subColor}
            />
          </TouchableOpacity>
        </View>

        <GoogleDriveSection
          isDark={isDark}
          cardBg={cardBg}
          textColor={textColor}
          subColor={subColor}
          borderColor={borderColor}
          inputBg={inputBg}
          accentColor={accentColor}
          onRestoreRequest={(data) => {
            setImportRestoreSettings(true);
            setImportConfirmData(data);
          }}
        />

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
          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />
          <TouchableOpacity style={styles.row} onPress={handleImport} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: '#3b82f620' }]}>
              <MaterialIcons name="file-upload" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Import Data</Text>
            <Text style={[styles.rowValue, { color: subColor }]}>JSON</Text>
            <MaterialIcons name="chevron-right" size={20} color={subColor} />
          </TouchableOpacity>
          <View style={[styles.rowDivider, { backgroundColor: borderColor }]} />
          <TouchableOpacity style={styles.row} onPress={handleMonefyImport} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: '#8b5cf620' }]}>
              <MaterialIcons name="swap-horiz" size={20} color="#8b5cf6" />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>Import from Monefy</Text>
            <Text style={[styles.rowValue, { color: subColor }]}>CSV</Text>
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
          <Text style={[styles.appName, { color: subColor }]}>It's a My Money!</Text>
          <Text style={[styles.appVersion, { color: isDark ? '#3a4a6e' : '#d1d5db' }]}>v{Constants.expoConfig?.version}</Text>
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
              This will permanently delete all transactions, accounts, and custom categories, and restore the app to its default state.
            </Text>
            <View style={[styles.modalWarn, { backgroundColor: isDark ? '#2d2000' : '#fffbeb' }]}>
              <MaterialIcons name="warning" size={14} color="#f59e0b" />
              <Text style={[styles.modalWarnText, { color: '#f59e0b' }]}>This cannot be undone.</Text>
            </View>
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

      {/* Import confirm modal */}
      <Modal visible={!!importConfirmData} animationType="fade" transparent onRequestClose={() => setImportConfirmData(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setImportConfirmData(null)} />
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#3b82f620' }]}>
              <MaterialIcons name="file-upload" size={32} color="#3b82f6" />
            </View>
            <Text style={[styles.modalTitle, { color: textColor }]}>Import Backup?</Text>
            <Text style={[styles.resetWarningText, { color: subColor }]}>
              This will replace all current data with the imported backup.
            </Text>
            {importConfirmData && (
              <View style={[styles.importSummary, { backgroundColor: inputBg }]}>
                <Text style={[styles.importSummaryItem, { color: textColor }]}>
                  {importConfirmData.accounts.length} accounts · {importConfirmData.categories.length} categories
                </Text>
                <Text style={[styles.importSummaryItem, { color: subColor }]}>
                  {importConfirmData.transactions.length} transactions · {importConfirmData.transfers.length} transfers
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.importSettingsRow, { backgroundColor: inputBg }]}
              onPress={() => setImportRestoreSettings((v) => !v)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={importRestoreSettings ? 'check-box' : 'check-box-outline-blank'}
                size={22}
                color={importRestoreSettings ? accentColor : subColor}
              />
              <Text style={[styles.importSettingsLabel, { color: textColor }]}>Restore preferences</Text>
            </TouchableOpacity>
            <View style={[styles.modalWarn, { backgroundColor: isDark ? '#2d2000' : '#fffbeb' }]}>
              <MaterialIcons name="warning" size={14} color="#f59e0b" />
              <Text style={[styles.modalWarnText, { color: '#f59e0b' }]}>This cannot be undone.</Text>
            </View>
            <View style={[styles.modalDivider, { backgroundColor: borderColor }]} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setImportConfirmData(null)}>
                <Text style={[styles.modalBtnCancelText, { color: subColor }]}>Cancel</Text>
              </TouchableOpacity>
              <View style={[styles.modalBtnDivider, { backgroundColor: borderColor }]} />
              <TouchableOpacity style={styles.modalBtnDelete} onPress={() => importConfirmData && doImport(importConfirmData)}>
                <Text style={styles.modalBtnDeleteText}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Info modal (success / error) */}
      <InfoModal
        visible={!!infoModal}
        onClose={() => setInfoModal(null)}
        icon={infoModal?.icon ?? 'info'}
        iconColor={infoModal?.iconColor ?? '#ef4444'}
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
      />

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
  appName: { fontSize: 15, fontFamily: 'LilitaOne' },
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
  importSummary: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, gap: 4 },
  importSummaryItem: { fontSize: 13, textAlign: 'center' },
  importSettingsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, gap: 8 },
  importSettingsLabel: { fontSize: 14, fontWeight: '500' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  themeCard: { width: '46%', borderRadius: 10, overflow: 'hidden', position: 'relative' },
  themePreview: { height: 48, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 6 },
  themePreviewCard: { width: '60%', height: 20, borderRadius: 4, opacity: 0.9 },
  themeLabel: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 6 },
  themeCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
