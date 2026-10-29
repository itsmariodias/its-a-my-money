import type { RefObject } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '@/shared/components/Themed';
import AccountIcon from '@/shared/components/AccountIcon';
import { useAppTheme } from '@/shared/components/useAppTheme';
import { sheetStyles as styles } from '@/constants/sheetStyles';
import type { Account } from '@/types';

/** Width of one card plus the row gap — for scrolling a selected card into view. */
export const ACCOUNT_CARD_STRIDE = 110;

interface Props {
  accounts: readonly Account[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Given by sheets that scroll the selected card into view once they open. */
  scrollRef?: RefObject<ScrollView | null>;
}

/** Horizontal row of selectable account cards, shared by every sheet that picks an account. */
export default function AccountCardPicker({ accounts, selectedId, onSelect, scrollRef }: Props) {
  const { textColor, inputBg, borderColor } = useAppTheme();

  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll} contentContainerStyle={styles.accountScrollContent}>
      {accounts.map((acc) => {
        const isSelected = selectedId === acc.id;
        const accentBg = acc.color ?? '#55A3FF';
        return (
          <TouchableOpacity
            key={acc.id}
            style={[
              styles.accountCard,
              {
                backgroundColor: isSelected ? accentBg + '18' : inputBg,
                borderColor: isSelected ? accentBg : borderColor,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
            onPress={() => onSelect(acc.id)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={[styles.accountCardIcon, { backgroundColor: accentBg }]}>
              <AccountIcon name={acc.icon ?? 'account-balance-wallet'} size={20} color="#fff" />
            </View>
            <Text style={[styles.accountCardName, { color: isSelected ? accentBg : textColor }]} numberOfLines={1}>
              {acc.name}
            </Text>
            {isSelected && (
              <View style={[styles.accountCardCheck, { backgroundColor: accentBg }]}>
                <MaterialIcons name="check" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
