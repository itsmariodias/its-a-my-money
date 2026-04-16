import { create } from 'zustand';
import type { ThemeId } from '@/constants/theme';

interface SettingsState {
  currency: string;
  accentColor: string;
  numberFormat: string; // Intl locale key or 'plain'
  biometricLock: boolean;
  showPctChange: boolean;
  themeId: ThemeId;
  setCurrency: (code: string) => void;
  setAccentColor: (color: string) => void;
  setNumberFormat: (format: string) => void;
  setBiometricLock: (enabled: boolean) => void;
  setShowPctChange: (enabled: boolean) => void;
  setThemeId: (id: ThemeId) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  accentColor: '#FFB300',
  numberFormat: 'en-US',
  biometricLock: false,
  showPctChange: true,
  themeId: 'mario-light',
  setCurrency: (currency) => set({ currency }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setNumberFormat: (numberFormat) => set({ numberFormat }),
  setBiometricLock: (biometricLock) => set({ biometricLock }),
  setShowPctChange: (showPctChange) => set({ showPctChange }),
  setThemeId: (themeId) => set({ themeId }),
}));
