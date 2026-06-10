import { create } from 'zustand';
import type { ThemeId } from '@/constants/theme';
import { DEFAULT_DATE_FORMAT, type DateFormatId } from '@/constants/dateFormats';

interface SettingsState {
  currency: string;
  accentColor: string;
  numberFormat: string; // Intl locale key or 'plain'
  dateFormat: DateFormatId;
  biometricLock: boolean;
  showPctChange: boolean;
  themeId: ThemeId;
  setCurrency: (code: string) => void;
  setAccentColor: (color: string) => void;
  setNumberFormat: (format: string) => void;
  setDateFormat: (format: DateFormatId) => void;
  setBiometricLock: (enabled: boolean) => void;
  setShowPctChange: (enabled: boolean) => void;
  setThemeId: (id: ThemeId) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  accentColor: '#FFB300',
  numberFormat: 'en-US',
  dateFormat: DEFAULT_DATE_FORMAT,
  biometricLock: false,
  showPctChange: true,
  themeId: 'mario-light',
  setCurrency: (currency) => set({ currency }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setNumberFormat: (numberFormat) => set({ numberFormat }),
  setDateFormat: (dateFormat) => set({ dateFormat }),
  setBiometricLock: (biometricLock) => set({ biometricLock }),
  setShowPctChange: (showPctChange) => set({ showPctChange }),
  setThemeId: (themeId) => set({ themeId }),
}));
