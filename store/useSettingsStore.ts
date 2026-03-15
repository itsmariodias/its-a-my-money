import { create } from 'zustand';

interface SettingsState {
  currency: string;
  accentColor: string;
  numberFormat: string; // Intl locale key or 'plain'
  setCurrency: (code: string) => void;
  setAccentColor: (color: string) => void;
  setNumberFormat: (format: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  accentColor: '#2f95dc',
  numberFormat: 'en-US',
  setCurrency: (currency) => set({ currency }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setNumberFormat: (numberFormat) => set({ numberFormat }),
}));
