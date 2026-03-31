import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { THEMES } from '@/constants/theme';
import type { ResolvedThemeId } from '@/constants/theme';
import { useColorScheme } from '@/shared/components/useColorScheme';

export function useAppTheme() {
  const themeId = useSettingsStore((s) => s.themeId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const systemScheme = useColorScheme();

  const resolvedId: ResolvedThemeId =
    themeId === 'auto-mario' ? (systemScheme === 'dark' ? 'mario' : 'mario-light') :
    themeId === 'auto-bw'    ? (systemScheme === 'dark' ? 'oled'  : 'white') :
    themeId;

  const theme = THEMES[resolvedId];
  return { isDark: theme.isDark, ...theme.colors, accentColor, onAccentColor: theme.isDark ? '#ffffff' : '#000000' };
}
