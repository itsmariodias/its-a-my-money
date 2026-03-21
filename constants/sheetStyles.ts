import { StyleSheet } from 'react-native';
import { sheetErrorText } from './theme';

/**
 * Shared styles used across all bottom sheet components.
 * Import this and spread it with any sheet-specific styles:
 *   const localStyles = StyleSheet.create({ ... });
 *   const styles = { ...sheetStyles, ...localStyles };
 */
export const sheetStyles = StyleSheet.create({
  // Modal structure
  backdrop: { backgroundColor: 'rgba(0,0,0,0.4)' },
  kvContainer: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
  dragArea: { paddingTop: 12, paddingBottom: 12, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Labels
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  errorText: sheetErrorText,

  // Amount / balance input row
  amountContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20 },
  currencySymbol: { fontSize: 28, fontWeight: '300', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '600', paddingVertical: 16 },

  // Type toggle (expense / income)
  typeToggle: { flexDirection: 'row', borderRadius: 10, padding: 4, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  typeBtnText: { fontWeight: '600', fontSize: 14 },

  // Account picker
  accountScroll: { marginBottom: 20 },
  accountScrollContent: { gap: 10, paddingRight: 4 },
  accountCard: { width: 100, borderRadius: 12, padding: 12, gap: 4, position: 'relative' },
  accountCardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  accountCardName: { fontSize: 14, fontWeight: '600' },
  accountCardCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Date picker
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12 },
  dateText: { flex: 1, fontSize: 14 },
  datePickerCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  datePicker: { alignSelf: 'center' },
  datePickerDone: { paddingVertical: 13, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },

  // Text inputs
  noteInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 16 },
  textInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },

  // Color / icon pickers
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  iconItemInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Action buttons
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveAndContinueBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 0, marginBottom: 8, borderWidth: 1.5 },
  saveAndContinueBtnText: { fontSize: 16, fontWeight: '600' },
  deleteBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 8, backgroundColor: '#ef444420' },
  deleteBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
