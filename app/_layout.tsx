import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import 'react-native-reanimated';
import { Text } from '@/shared/components/Themed';

import { useColorScheme } from '@/shared/components/useColorScheme';
import { runMigrations } from '@/db/migrations';
import { useSettingsDb } from '@/db';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useBackupStore } from '@/features/backup/useBackupStore';
import type { BackupFrequency } from '@/features/backup/useBackupStore';
import { useAutoBackup } from '@/features/backup/useAutoBackup';
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
    LilitaOne: require('../assets/fonts/LilitaOne-Regular.ttf'),
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
  const setBiometricLock = useSettingsStore((s) => s.setBiometricLock);
  const biometricLock = useSettingsStore((s) => s.biometricLock);
  const accentColor = useSettingsStore((s) => s.accentColor);

  const setGoogleDriveEnabled = useBackupStore((s) => s.setGoogleDriveEnabled);
  const setGoogleEmail = useBackupStore((s) => s.setGoogleEmail);
  const setBackupFolder = useBackupStore((s) => s.setFolder);
  const setBackupFrequency = useBackupStore((s) => s.setBackupFrequency);
  const setLastBackupAt = useBackupStore((s) => s.setLastBackupAt);

  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    settingsDb.get('currency').then((row) => { if (row) setCurrency(row.value); });
    settingsDb.get('accent_color').then((row) => { if (row) setAccentColor(row.value); });
    settingsDb.get('number_format').then((row) => { if (row) setNumberFormat(row.value); });
    settingsDb.get('biometric_lock').then((row) => { if (row) setBiometricLock(row.value === 'true'); });
    settingsDb.get('google_drive_enabled').then((row) => { if (row) setGoogleDriveEnabled(row.value === 'true'); });
    settingsDb.get('google_email').then((row) => { if (row) setGoogleEmail(row.value); });
    settingsDb.get('google_drive_folder_id').then((row) => {
      if (row) settingsDb.get('google_drive_folder_name').then((nameRow) => {
        setBackupFolder(row.value, nameRow?.value ?? null);
      });
    });
    settingsDb.get('backup_frequency').then((row) => { if (row) setBackupFrequency(row.value as BackupFrequency); });
    settingsDb.get('last_backup_at').then((row) => { if (row) setLastBackupAt(row.value); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoBackup();

  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock It's a My Money!",
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });
    if (result.success) setIsLocked(false);
  }, []);

  const backgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!biometricLock) {
      setIsLocked(false);
      return;
    }
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundAtRef.current = Date.now();
      } else if (nextState === 'active') {
        const gone = backgroundAtRef.current ? Date.now() - backgroundAtRef.current : Infinity;
        backgroundAtRef.current = null;
        // Only lock if the app was in the background for more than 3 seconds
        // (brief trips like Google Sign-In or share sheets shouldn't trigger the lock)
        if (gone > 3000) {
          setIsLocked(true);
          authenticate();
        }
      }
    });
    return () => subscription.remove();
  }, [biometricLock, authenticate]);

  const isDark = colorScheme === 'dark';
  const { bg, textColor, subColor } = getColors(isDark);

  return (
    <ThemeProvider value={isDark ? darkNavTheme : lightNavTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      {isLocked && biometricLock && (
        <View style={[lockStyles.overlay, { backgroundColor: bg }]}>
          <MaterialIcons name="lock" size={48} color={subColor} />
          <Text style={[lockStyles.title, { color: textColor }]}>App Locked</Text>
          <Text style={[lockStyles.subtitle, { color: subColor }]}>Authenticate to continue</Text>
          <TouchableOpacity onPress={authenticate} style={[lockStyles.retryBtn, { backgroundColor: accentColor }]}>
            <Text style={lockStyles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ThemeProvider>
  );
}

const lockStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  title: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  subtitle: { fontSize: 14, marginTop: 8 },
  retryBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
