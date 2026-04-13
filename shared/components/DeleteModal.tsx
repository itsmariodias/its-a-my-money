import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';

interface DeleteModalProps {
  visible: boolean;
  title: string;
  /** Body message shown below the item chip */
  message?: string;
  /** Amber warning text. If omitted, "This action cannot be undone." is shown. */
  warning?: string;
  /** Pass false to suppress the warning row entirely */
  showWarning?: boolean;
  /** Label for the confirm button (default: "Delete") */
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Optional item chip or extra content rendered between title and message */
  children?: React.ReactNode;
}

export default function DeleteModal({
  visible,
  title,
  message,
  warning = 'This action cannot be undone.',
  showWarning = true,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
  children,
}: DeleteModalProps) {
  const { cardBg, textColor, subColor, borderColor } = useAppTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="delete-forever" size={32} color="#F44336" />
          </View>

          <Text style={[styles.title, { color: textColor }]}>{title}</Text>

          {children}

          {message && (
            <Text style={[styles.message, { color: subColor }]}>{message}</Text>
          )}

          {showWarning && (
            <View style={styles.warningRow}>
              <MaterialIcons name="warning-amber" size={14} color="#FFC107" />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onCancel}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.btnCancelText, { color: subColor }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={[styles.btnDivider, { backgroundColor: borderColor }]} />
            <TouchableOpacity
              style={styles.btnConfirm}
              onPress={onConfirm}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityHint="Double tap to permanently delete. This cannot be undone."
            >
              <Text style={styles.btnConfirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F4433620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFC107',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '120%',
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  btnDivider: {
    width: StyleSheet.hairlineWidth,
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F44336',
  },
});
