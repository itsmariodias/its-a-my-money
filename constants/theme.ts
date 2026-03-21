export interface AppColors {
  bg: string;         // page / screen background
  cardBg: string;     // card / surface background
  inputBg: string;    // text input / chip background
  textColor: string;
  subColor: string;
  borderColor: string;
}

export const ACCENT_COLORS = [
  '#2f95dc',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#22c55e',
  '#14b8a6',
];

import { TextStyle } from 'react-native';

/** Shared validation error style — use as the `errorText` entry in any sheet's StyleSheet. */
export const sheetErrorText: TextStyle = {
  fontSize: 12,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: '#ef4444',
  marginTop: -8,
  marginBottom: 8,
};

export function getColors(isDark: boolean): AppColors {
  return isDark
    ? {
        bg: '#0d0d1a',
        cardBg: '#1a1a2e',
        inputBg: '#1a2035',
        textColor: '#e0e0e0',
        subColor: '#a0a0b0',
        borderColor: '#2a2a44',
      }
    : {
        bg: '#f2f2f7',
        cardBg: '#ffffff',
        inputBg: '#f0f4f8',
        textColor: '#1a1a2e',
        subColor: '#6b7280',
        borderColor: '#e2e8f0',
      };
}
