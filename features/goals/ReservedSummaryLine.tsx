import { StyleSheet } from 'react-native';
import { Text } from '@/shared/components/Themed';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount } from '@/constants/currencies';

interface Props {
  /** The balance the goals' money is set aside from, in `currency`. */
  total: number;
  /** Money held in goals; undefined when no goal holds any, which hides the line. */
  reserved: number | undefined;
  currency: string;
  color: string;
}

/** "Reserved X · Available Y" under a total balance — the Accounts tab total card and the Dashboard. */
export default function ReservedSummaryLine({ total, reserved, currency, color }: Props) {
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  if (reserved === undefined) return null;
  return (
    <Text style={[styles.line, { color }]} numberOfLines={1}>
      Reserved {formatAmount(reserved, currency, undefined, numberFormat)} · Available {formatAmount(total - reserved, currency, undefined, numberFormat)}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 13, fontWeight: '500', marginTop: 4 },
});
