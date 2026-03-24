import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useAppTheme } from '@/shared/components/useAppTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  icon: string;
  iconColor: string;
  title: string;
  message: string;
}

export default function InfoModal({ visible, onClose, icon, iconColor, title, message }: Props) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const { cardBg, textColor, subColor, borderColor } = useAppTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" accessibilityRole="button" />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '20' }]}>
            <MaterialIcons name={icon as any} size={32} color={iconColor} />
          </View>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.message, { color: subColor }]}>{message}</Text>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <TouchableOpacity style={styles.btn} onPress={onClose} accessibilityRole="button">
            <Text style={{ color: accentColor, fontSize: 15, fontWeight: '600' }}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { width: '100%', borderRadius: 20, overflow: 'hidden', paddingTop: 28, paddingHorizontal: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -24 },
  btn: { paddingVertical: 16, alignItems: 'center' },
});
