import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import 'react-native-reanimated';
import { Text } from '@/shared/components/Themed';

import { runMigrations } from '@/db/migrations';
import { useSettingsDb } from '@/db';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useBackupStore } from '@/features/backup/useBackupStore';
import { useUIStore } from '@/shared/store/useUIStore';
import type { BackupFrequency } from '@/features/backup/useBackupStore';
import { useAutoBackup } from '@/features/backup/useAutoBackup';
import { useRecurringCheck } from '@/features/recurring/useRecurringCheck';
import { useAppTheme } from '@/shared/components/useAppTheme';
import type { ThemeId } from '@/constants/theme';

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
  const settingsDb = useSettingsDb();
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const setNumberFormat = useSettingsStore((s) => s.setNumberFormat);
  const setBiometricLock = useSettingsStore((s) => s.setBiometricLock);
  const setShowPctChange = useSettingsStore((s) => s.setShowPctChange);
  const setThemeId = useSettingsStore((s) => s.setThemeId);
  const biometricLock = useSettingsStore((s) => s.biometricLock);

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
    settingsDb.get('show_pct_change').then((row) => { if (row) setShowPctChange(row.value === 'true'); });
    settingsDb.get('biometric_lock').then((row) => {
      if (row) {
        const enabled = row.value === 'true';
        setBiometricLock(enabled);
        if (enabled) {
          setIsLocked(true);
          authenticate();
        }
      }
    });
    settingsDb.get('google_drive_enabled').then((row) => { if (row) setGoogleDriveEnabled(row.value === 'true'); });
    settingsDb.get('google_email').then((row) => { if (row) setGoogleEmail(row.value); });
    settingsDb.get('google_drive_folder_id').then((row) => {
      if (row) settingsDb.get('google_drive_folder_name').then((nameRow) => {
        setBackupFolder(row.value, nameRow?.value ?? null);
      });
    });
    settingsDb.get('backup_frequency').then((row) => { if (row) setBackupFrequency(row.value as BackupFrequency); });
    settingsDb.get('last_backup_at').then((row) => { if (row) setLastBackupAt(row.value); });
    settingsDb.get('theme_id').then((row) => {
      if (row) {
        const v = row.value === 'dark-blue' ? 'mario-light' : row.value === 'auto' ? 'auto-mario' : row.value;
        setThemeId(v as ThemeId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoBackup();
  useRecurringCheck();

  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock It's a My Money!",
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });
    if (result.success) setIsLocked(false);
  }, []);

  useEffect(() => {
    if (!biometricLock) {
      setIsLocked(false);
      return;
    }
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // Skip lock when returning from an app-initiated external activity
        // (Google Sign-In, share sheets, document picker)
        if (useUIStore.getState().externalActivityActive) {
          useUIStore.getState().setExternalActivityActive(false);
          return;
        }
        setIsLocked(true);
        authenticate();
      }
    });
    return () => subscription.remove();
  }, [biometricLock, authenticate]);

  const { isDark, bg, textColor, subColor, accentColor, onAccentColor } = useAppTheme();
  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: bg, card: bg } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: bg, card: bg } };

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <Modal visible={!!(isLocked && biometricLock)} transparent={false} animationType="fade" statusBarTranslucent>
        <View style={[lockStyles.overlay, { backgroundColor: bg }]}>
          <MaterialIcons name="lock" size={48} color={subColor} />
          <Text style={[lockStyles.title, { color: textColor }]}>App Locked</Text>
          <Text style={[lockStyles.subtitle, { color: subColor }]}>Authenticate to continue</Text>
          <TouchableOpacity onPress={authenticate} style={[lockStyles.retryBtn, { backgroundColor: accentColor }]}>
            <Text style={[lockStyles.retryBtnText, { color: onAccentColor }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ThemeProvider>
  );
}

const lockStyles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  subtitle: { fontSize: 14, marginTop: 8 },
  retryBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
