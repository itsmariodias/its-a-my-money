import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';

interface Props {
  name: string;
  size: number;
  color: string;
}

/** Renders either a MaterialIcons or FontAwesome6 icon depending on the name.
 *  FontAwesome6 brand icons are stored with a "fa6:" prefix (e.g. "fa6:cc-visa"). */
export default function AccountIcon({ name, size, color }: Props) {
  // Icons are text glyphs, and Android sizes their text box from font metrics rather than the
  // glyph: it pads above and below, and the box can come out a pixel or two off sideways, which
  // shows as an off-centre icon in a small circle. Pinning the box to the glyph and centring the
  // glyph inside it lets the parent's flexbox centre it exactly.
  const glyphBox = { lineHeight: size, includeFontPadding: false, textAlign: 'center' as const };
  if (name.startsWith('fa6:')) {
    // Brand glyphs are wider than they are tall, so only the height is pinned.
    return <FontAwesome6 name={name.slice(4) as any} size={size} color={color} style={glyphBox} />;
  }
  return (
    <MaterialIcons
      name={(name || 'account-balance-wallet') as any}
      size={size}
      color={color}
      style={[glyphBox, { width: size, height: size }]}
    />
  );
}
