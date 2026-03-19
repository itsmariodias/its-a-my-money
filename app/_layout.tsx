import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { runMigrations } from '@/db/migrations';
import { useSettingsDb } from '@/db';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getColors } from '@/constants/theme';

const lightNavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: getColors(false).bg, card: getColors(false).bg },
};
const darkNavTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: getColors(true).bg, card: getColors(true).bg },
};

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SQLiteProvider
      databaseName="its-a-my-money.db"
      onInit={runMigrations}
      useSuspense
    >
      <Suspense
        fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        }
      >
        <RootLayoutNav />
      </Suspense>
    </SQLiteProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const settingsDb = useSettingsDb();
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const setNumberFormat = useSettingsStore((s) => s.setNumberFormat);

  useEffect(() => {
    settingsDb.get('currency').then((row) => { if (row) setCurrency(row.value); });
    settingsDb.get('accent_color').then((row) => { if (row) setAccentColor(row.value); });
    settingsDb.get('number_format').then((row) => { if (row) setNumberFormat(row.value); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDark = colorScheme === 'dark';
  const { bg } = getColors(isDark);

  return (
    <ThemeProvider value={isDark ? darkNavTheme : lightNavTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
