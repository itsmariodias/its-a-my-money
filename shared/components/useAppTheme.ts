import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { THEMES } from '@/constants/theme';

export function useAppTheme() {
  const themeId = useSettingsStore((s) => s.themeId);
  const theme = THEMES[themeId];
  return { isDark: theme.isDark, ...theme.colors };
}
