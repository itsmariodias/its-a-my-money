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

interface BaseProps {
  accounts: readonly Account[];
  selectedId: number | null;
  /** Given by sheets that scroll the selected card into view once they open. */
  scrollRef?: RefObject<ScrollView | null>;
}

type Props = BaseProps & (
  | { allOption?: undefined; onSelect: (id: number) => void }
  /** Adds a leading card with this label, selected when `selectedId` is null; picking it calls `onSelect(null)`. */
  | { allOption: string; onSelect: (id: number | null) => void }
);

/** Horizontal row of selectable account cards, shared by every sheet that picks an account. */
export default function AccountCardPicker(props: Props) {
  const { accounts, selectedId, onSelect, scrollRef } = props;
  const { accentColor } = useAppTheme();

  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll} contentContainerStyle={styles.accountScrollContent}>
      {props.allOption !== undefined && (
        <AccountCard
          name={props.allOption}
          icon="layers"
          color={accentColor}
          isSelected={selectedId === null}
          onPress={() => props.onSelect(null)}
        />
      )}
      {accounts.map((acc) => (
        <AccountCard
          key={acc.id}
          name={acc.name}
          icon={acc.icon ?? 'account-balance-wallet'}
          color={acc.color ?? '#55A3FF'}
          isSelected={selectedId === acc.id}
          onPress={() => onSelect(acc.id)}
        />
      ))}
    </ScrollView>
  );
}

function AccountCard({
  name, icon, color, isSelected, onPress,
}: {
  name: string; icon: string; color: string; isSelected: boolean; onPress: () => void;
}) {
  const { textColor, inputBg, borderColor } = useAppTheme();
  return (
    <TouchableOpacity
      style={[
        styles.accountCard,
        {
          backgroundColor: isSelected ? color + '18' : inputBg,
          borderColor: isSelected ? color : borderColor,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
    >
      <View style={[styles.accountCardIcon, { backgroundColor: color }]}>
        <AccountIcon name={icon} size={20} color="#fff" />
      </View>
      <Text style={[styles.accountCardName, { color: isSelected ? color : textColor }]} numberOfLines={1}>
        {name}
      </Text>
      {isSelected && (
        <View style={[styles.accountCardCheck, { backgroundColor: color }]}>
          <MaterialIcons name="check" size={10} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}
