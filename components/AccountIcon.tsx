import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';

interface Props {
  name: string;
  size: number;
  color: string;
}

/** Renders either a MaterialIcons or FontAwesome6 icon depending on the name.
 *  FontAwesome6 brand icons are stored with a "fa6:" prefix (e.g. "fa6:cc-visa"). */
export default function AccountIcon({ name, size, color }: Props) {
  if (name.startsWith('fa6:')) {
    return <FontAwesome6 name={name.slice(4) as any} size={size} color={color} />;
  }
  return <MaterialIcons name={(name || 'account-balance-wallet') as any} size={size} color={color} />;
}
