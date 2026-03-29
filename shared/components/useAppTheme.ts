import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { THEMES } from '@/constants/theme';

export function useAppTheme() {
  const themeId = useSettingsStore((s) => s.themeId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const theme = THEMES[themeId];
  return { isDark: theme.isDark, ...theme.colors, accentColor, onAccentColor: theme.isDark ? '#ffffff' : '#000000' };
}
