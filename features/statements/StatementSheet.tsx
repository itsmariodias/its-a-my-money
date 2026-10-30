import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as LegacyFS from 'expo-file-system/legacy';
import InfoModal from '@/shared/components/InfoModal';
import OperationLockModal from '@/shared/components/OperationLockModal';
import { Text } from '@/shared/components/Themed';
import DatePickerField from '@/shared/components/DatePickerField';
import AccountCardPicker from '@/shared/components/AccountCardPicker';
import SheetFooter from '@/shared/components/SheetFooter';
import { useAccountsStore } from '@/features/accounts/useAccountsStore';
import { useTransactionsStore } from '@/features/transactions/useTransactionsStore';
import { useTransfersStore } from '@/features/transfers/useTransfersStore';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useUIStore } from '@/shared/store/useUIStore';
import { saveToExportFolder } from '@/shared/saveToExportFolder';
import { useSettingsDb } from '@/db';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';
import { todayString } from '@/features/recurring/dateUtils';
import { STATEMENT_PRESETS, buildStatement, defaultStatementRange } from './statementData';
import { exportStatementPdf } from './exportStatementPdf';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DEFAULT_PRESET = STATEMENT_PRESETS[0].id;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Picks an account and a date range, then renders a bank-style PDF statement and opens the share sheet. */
export default function StatementSheet({ isOpen, onClose }: Props) {
  const accounts = useAccountsStore((s) => s.accounts);
  const transactions = useTransactionsStore((s) => s.transactions);
  const transfers = useTransfersStore((s) => s.transfers);
  const accentColorValue = useSettingsStore((s) => s.accentColor);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const settingsDb = useSettingsDb();

  const [accountId, setAccountId] = useState<number | null>(null);
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET);
  const [range, setRange] = useState(() => defaultStatementRange());
  const [generating, setGenerating] = useState(false);
  const [infoModal, setInfoModal] = useState<{ icon: string; iconColor: string; title: string; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAccountId(null);
    setPresetId(DEFAULT_PRESET);
    setRange(defaultStatementRange());
  }, [isOpen]);

  const rangeError = range.start > range.end ? 'The start date must be on or before the end date' : null;

  const statement = useMemo(
    () => buildStatement({ accounts, transactions, transfers, start: range.start, end: range.end, accountId }),
    [accounts, transactions, transfers, range, accountId],
  );
  const entryCount = statement.sections.reduce((n, s) => n + s.rows.length, 0);

  const selectPreset = (id: string) => {
    const preset = STATEMENT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setRange(preset.range(new Date()));
  };

  // Editing a date by hand leaves the presets behind.
  const setStart = (start: string) => { setPresetId(null); setRange((r) => ({ ...r, start })); };
  const setEnd = (end: string) => { setPresetId(null); setRange((r) => ({ ...r, end })); };

  const showError = (message: string) =>
    setInfoModal({ icon: 'error', iconColor: '#F44336', title: 'Export Failed', message });

  // Android: straight into the export folder, like Export Data. iOS: the share sheet, which has Save to Files.
  const saveToFolder = async (pdf: { uri: string; filename: string }) => {
    const contents = await LegacyFS.readAsStringAsync(pdf.uri, { encoding: LegacyFS.EncodingType.Base64 });
    const result = await saveToExportFolder(
      settingsDb,
      { filename: pdf.filename, mimeType: 'application/pdf', contents, encoding: 'base64' },
      (open) => setGenerating(!open),
    );
    setGenerating(false);
    if (result.status === 'saved') {
      triggerCloseRef.current();
      setInfoModal({ icon: 'check-circle', iconColor: '#4CAF50', title: 'Statement Saved', message: `Saved to ${result.path}` });
    } else if (result.status === 'failed') {
      showError('Could not save the statement to the selected folder.');
    }
  };

  const share = async (pdf: { uri: string }) => {
    // Dismiss the overlay before the OS share sheet.
    setGenerating(false);
    if (!(await Sharing.isAvailableAsync())) {
      showError('Your device does not support sharing files.');
      return;
    }
    useUIStore.getState().setExternalActivityActive(true);
    await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share statement' });
    triggerCloseRef.current();
  };

  const handleExport = async () => {
    if (rangeError) return;
    setGenerating(true);
    let pdf: { uri: string; filename: string };
    try {
      pdf = await exportStatementPdf(statement, {
        accentColor: accentColorValue,
        numberFormat,
        dateFormat,
        generatedOn: todayString(),
      });
    } catch {
      setGenerating(false);
      showError('Could not generate the statement.');
      return;
    }
    try {
      if (Platform.OS === 'android') await saveToFolder(pdf);
      else await share(pdf);
    } catch {
      setGenerating(false);
      useUIStore.getState().setExternalActivityActive(false);
      showError('Could not save the statement.');
    }
  };

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

  const accountCount = statement.sections.length;
  const countLabel = `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} · ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'}`;

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
              <Text style={[styles.headerTitle, { color: textColor }]}>Export Statement</Text>
              <TouchableOpacity onPress={() => triggerCloseRef.current()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Account */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Account</Text>
              <AccountCardPicker accounts={accounts} selectedId={accountId} onSelect={setAccountId} allOption="All" />

              {/* Period */}
              <Text style={[styles.sectionLabel, { color: subTextColor }]}>Period</Text>
              <View style={[styles.typeToggle, { backgroundColor: inputBg }]}>
                {STATEMENT_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.periodBtn, presetId === p.id && { backgroundColor: accentColor }]}
                    onPress={() => selectPreset(p.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: presetId === p.id }}
                  >
                    <Text style={[styles.periodBtnText, { color: presetId === p.id ? onAccentColor : subTextColor }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={localStyles.dateFields}>
                <View style={localStyles.dateField}>
                  <Text style={[styles.sectionLabel, { color: subTextColor }]}>From</Text>
                  <DatePickerField date={range.start} onChange={setStart} />
                </View>
                <View style={localStyles.dateField}>
                  <Text style={[styles.sectionLabel, { color: subTextColor }]}>To</Text>
                  <DatePickerField date={range.end} onChange={setEnd} minDate={range.start} />
                </View>
              </View>

              {rangeError ? (
                <Text style={styles.errorText}>{rangeError}</Text>
              ) : (
                <Text style={[localStyles.hint, { color: subTextColor }]}>{countLabel}</Text>
              )}
            </ScrollView>
            <SheetFooter primary={{ label: 'Export PDF', onPress: handleExport }} />
          </Animated.View>
        </View>
      </Modal>

      <OperationLockModal visible={generating} message="Generating statement…" />

      <InfoModal
        visible={!!infoModal}
        onClose={() => setInfoModal(null)}
        icon={infoModal?.icon ?? 'error'}
        iconColor={infoModal?.iconColor ?? '#F44336'}
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
      />
    </>
  );
}

const localStyles = StyleSheet.create({
  dateFields: { flexDirection: 'row', gap: 12, marginTop: 4 },
  dateField: { flex: 1 },
  hint: { fontSize: 12, marginTop: 4, marginBottom: 16 },
});

const styles = { ...sheetStyles, ...localStyles };
