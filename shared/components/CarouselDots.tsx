import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

interface Props {
  index: number;
  onSelect: (i: number) => void;
  /** One per page, read by screen readers ("Show EUR total"). */
  accessibilityLabels: string[];
  activeColor: string;
  inactiveColor: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Page dots for a `useCarousel` carousel; tapping one jumps to that page. */
export default function CarouselDots({
  index, onSelect, accessibilityLabels, activeColor, inactiveColor, size = 6, style,
}: Props) {
  return (
    <View style={[styles.row, style]}>
      {accessibilityLabels.map((label, i) => (
        <TouchableOpacity
          key={label}
          onPress={() => onSelect(i)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: i === index }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: i === index ? activeColor : inactiveColor,
            }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
