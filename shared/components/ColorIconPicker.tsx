import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import AccountIcon from '@/shared/components/AccountIcon';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles } from '@/constants/sheetStyles';

export const PRESET_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
  '#795548', '#9E9E9E', '#607D8B',
];

const COLOR_NAMES: Record<string, string> = {
  '#F44336': 'Red',         '#E91E63': 'Pink',        '#9C27B0': 'Purple',      '#673AB7': 'Deep purple',
  '#3F51B5': 'Indigo',      '#2196F3': 'Blue',         '#03A9F4': 'Light blue',  '#00BCD4': 'Cyan',
  '#009688': 'Teal',        '#4CAF50': 'Green',        '#8BC34A': 'Light green', '#CDDC39': 'Lime',
  '#FFEB3B': 'Yellow',      '#FFC107': 'Amber',        '#FF9800': 'Orange',      '#FF5722': 'Deep orange',
  '#795548': 'Brown',       '#9E9E9E': 'Grey',         '#607D8B': 'Blue grey',
};

/** General-purpose icons, used by categories and goals. */
export const CATEGORY_ICONS: string[] = [
  'restaurant', 'directions-car', 'shopping-cart', 'movie',
  'local-hospital', 'receipt', 'home', 'flight',
  'fitness-center', 'local-cafe', 'school', 'pets',
  'phone-android', 'local-gas-station', 'sports-esports', 'work',
  'laptop', 'trending-up', 'card-giftcard', 'savings',
  'attach-money', 'business-center', 'more-horiz', 'label',
  'local-grocery-store', 'directions-bus', 'checkroom', 'account-balance', 'redeem',
  'local-taxi', 'soap', 'phone', 'sports-soccer',
];

/** Wallet, bank and card-brand icons. FontAwesome6 brand icons carry an "fa6:" prefix. */
export const ACCOUNT_ICONS: string[] = [
  // Wallet / bank
  'account-balance-wallet',
  'account-balance',
  'credit-card',
  'savings',
  'payments',
  'currency-exchange',
  'monetization-on',
  'business-center',
  // Card brands (FontAwesome6)
  'fa6:cc-visa',
  'fa6:cc-mastercard',
  'fa6:cc-amex',
  'fa6:cc-discover',
  'fa6:paypal',
  'fa6:apple-pay',
  'fa6:google-pay',
  'fa6:cc-stripe',
];

interface Props {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
  icons: readonly string[];
  /** 'compact' fits many small icons in a row; 'large' shows four big ones per row. */
  layout?: 'compact' | 'large';
}

/** The Color and Icon sections shared by the category, account and goal form sheets. */
export default function ColorIconPicker({ color, icon, onColorChange, onIconChange, icons, layout = 'compact' }: Props) {
  const { subColor, inputBg } = useAppTheme();
  const isLarge = layout === 'large';

  return (
    <>
      <Text style={[sheetStyles.sectionLabel, { color: subColor }]}>Color</Text>
      <View style={sheetStyles.colorGrid}>
        {PRESET_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onColorChange(c)}
            style={[sheetStyles.colorSwatch, { backgroundColor: c }, color === c && sheetStyles.colorSwatchSelected]}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ selected: color === c }}
            accessibilityLabel={COLOR_NAMES[c] ?? c}
          >
            {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[sheetStyles.sectionLabel, { color: subColor }]}>Icon</Text>
      <View style={isLarge ? styles.iconGridLarge : styles.iconGridCompact}>
        {icons.map((ic) => (
          <TouchableOpacity
            key={ic}
            onPress={() => onIconChange(ic)}
            style={[isLarge ? styles.iconItemLarge : styles.iconItemCompact, { backgroundColor: icon === ic ? color : inputBg }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: icon === ic }}
            accessibilityLabel={ic.replace(/^fa6:/, '').replace(/-/g, ' ')}
          >
            <View style={sheetStyles.iconItemInner}>
              <AccountIcon name={ic} size={isLarge ? 24 : 22} color={icon === ic ? '#fff' : subColor} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  iconGridCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconItemCompact: { width: '11%', minWidth: 44, minHeight: 44, borderRadius: 10 },
  iconGridLarge: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  iconItemLarge: { width: '22%', aspectRatio: 1, borderRadius: 12 },
});
