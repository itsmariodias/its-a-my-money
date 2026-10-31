import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/shared/components/Themed';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';

export interface SheetAction {
  label: string;
  onPress: () => void;
}

interface Props {
  primary: SheetAction;
  /** Shown beside the primary button: Save & Add Another, Mark as Complete. */
  secondary?: SheetAction | null;
}

/**
 * The action row pinned under a sheet's scrolling form, so Save stays in reach however long the
 * form gets. Goes directly after the sheet's ScrollView, which shrinks to make room. Destructive
 * actions stay at the end of the scrolling content instead, where they cannot be hit by accident.
 *
 * No keyboard handling: where the OS resizes the window the row rides above the keyboard, and
 * where it does not the keyboard covers it like the rest of the form.
 */
export default function SheetFooter({ primary, secondary }: Props) {
  const { accentColor, onAccentColor, borderColor } = useAppTheme();

  return (
    <View style={[styles.footer, { borderTopColor: borderColor }]}>
      {secondary && (
        <TouchableOpacity
          style={[sheetStyles.saveAndContinueBtn, styles.button, { borderColor: accentColor }]}
          onPress={secondary.onPress}
          accessibilityRole="button"
        >
          <Text style={[sheetStyles.saveAndContinueBtnText, { color: accentColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {secondary.label}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[sheetStyles.saveBtn, styles.button, { backgroundColor: accentColor }]}
        onPress={primary.onPress}
        accessibilityRole="button"
      >
        <Text style={[sheetStyles.saveBtnText, { color: onAccentColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {primary.label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  // Side by side, the row's gap does the spacing the stacked buttons' margins used to.
  button: { flex: 1, marginTop: 0, marginBottom: 0, paddingHorizontal: 8 },
});
