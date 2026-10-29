import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/shared/components/Themed';
import AccountIcon from '@/shared/components/AccountIcon';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { formatAmount, getCurrencySymbol } from '@/constants/currencies';
import { sheetStyles } from '@/constants/sheetStyles';
import type { GoalSplitMode, SplitErrors } from './goalUtils';
import type { GoalWithDetails } from '@/types';

interface Props {
  mode: GoalSplitMode;
  /** The goals of the account the transaction is on. */
  goals: GoalWithDetails[];
  /** What each goal holds before this transaction's own splits. */
  savedByGoal: Record<number, number>;
  /** Raw amount text per goal id, as typed. */
  values: Record<number, string>;
  onChange: (goalId: number, text: string) => void;
  errors: SplitErrors;
  currency: string;
}

/**
 * Splits a transaction across the account's goals: on income, how much goes into each; on an
 * expense, how much each pays. Empty rows mean the goal is not part of this transaction.
 */
export default function GoalSplitField({ mode, goals, savedByGoal, values, onChange, errors, currency }: Props) {
  const { textColor, subColor, inputBg, borderColor } = useAppTheme();
  const numberFormat = useSettingsStore((s) => s.numberFormat);

  if (goals.length === 0) return null;

  const symbol = getCurrencySymbol(currency);

  return (
    <>
      <Text style={[sheetStyles.sectionLabel, { color: subColor }]}>
        {mode === 'reserve' ? 'Put toward goals (optional)' : 'Paid from goals (optional)'}
      </Text>
      <View style={[styles.card, { backgroundColor: inputBg, borderColor }]}>
        {goals.map((goal, index) => {
          const error = errors.byGoal[goal.id];
          return (
            <View key={goal.id} style={[styles.row, index > 0 && { borderTopColor: borderColor, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.iconCircle, { backgroundColor: goal.color }]}>
                <AccountIcon name={goal.icon} size={16} color="#fff" />
              </View>
              <View style={styles.body}>
                <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{goal.name}</Text>
                <Text style={[styles.sub, { color: error ? '#F44336' : subColor }]} numberOfLines={1}>
                  {error ?? `${formatAmount(savedByGoal[goal.id] ?? 0, currency, undefined, numberFormat)} of ${formatAmount(goal.target_amount, currency, undefined, numberFormat)}`}
                </Text>
              </View>
              <View style={[styles.inputWrap, { borderColor: error ? '#F44336' : borderColor }]}>
                <Text style={[styles.inputSymbol, { color: subColor }]}>{symbol}</Text>
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={values[goal.id] ?? ''}
                  onChangeText={(text) => onChange(goal.id, text)}
                  placeholder="0"
                  placeholderTextColor={subColor}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  accessibilityLabel={`Amount for ${goal.name}`}
                />
              </View>
            </View>
          );
        })}
      </View>
      {errors.total && <Text style={sheetStyles.errorText}>{errors.total}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, width: 104 },
  inputSymbol: { fontSize: 13, marginRight: 2 },
  input: { flex: 1, fontSize: 14, paddingVertical: 6, textAlign: 'right' },
});
