import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';

interface Props {
  visible: boolean;
  message: string;
}

export default function OperationLockModal({ visible, message }: Props) {
  const { cardBg, textColor, subColor } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <ActivityIndicator size="large" color={textColor} />
          <Text style={[styles.message, { color: subColor }]}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { width: '100%', borderRadius: 20, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', gap: 16 },
  message: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
