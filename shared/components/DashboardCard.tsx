import type { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/shared/components/useAppTheme';

interface Props {
  children: ReactNode;
  /** Makes the whole card a button (Budgets, Goals). */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** The rounded, shadowed card every Dashboard section sits in. */
export default function DashboardCard({ children, onPress, accessibilityLabel }: Props) {
  const { cardBg } = useAppTheme();
  const style = [styles.card, { backgroundColor: cardBg }];

  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
