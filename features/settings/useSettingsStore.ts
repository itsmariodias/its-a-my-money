import { create } from 'zustand';
import type { ThemeId } from '@/constants/theme';

interface SettingsState {
  currency: string;
  accentColor: string;
  numberFormat: string; // Intl locale key or 'plain'
  biometricLock: boolean;
  themeId: ThemeId;
  setCurrency: (code: string) => void;
  setAccentColor: (color: string) => void;
  setNumberFormat: (format: string) => void;
  setBiometricLock: (enabled: boolean) => void;
  setThemeId: (id: ThemeId) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  accentColor: '#2f95dc',
  numberFormat: 'en-US',
  biometricLock: false,
  themeId: 'dark-blue',
  setCurrency: (currency) => set({ currency }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setNumberFormat: (numberFormat) => set({ numberFormat }),
  setBiometricLock: (biometricLock) => set({ biometricLock }),
  setThemeId: (themeId) => set({ themeId }),
}));
