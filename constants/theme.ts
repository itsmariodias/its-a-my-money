export interface AppColors {
  bg: string;         // page / screen background
  cardBg: string;     // card / surface background
  inputBg: string;    // text input / chip background
  textColor: string;
  subColor: string;
  borderColor: string;
}

export type ThemeId = 'mario-light' | 'white' | 'oled' | 'mario' | 'auto-mario' | 'auto-bw';
export type ResolvedThemeId = Exclude<ThemeId, 'auto-mario' | 'auto-bw'>;

export interface AppTheme {
  id: ResolvedThemeId;
  label: string;
  isDark: boolean;
  colors: AppColors;
}

export const THEMES: Record<ResolvedThemeId, AppTheme> = {
  'mario-light': {
    id: 'mario-light',
    label: 'Sky Blue',
    isDark: false,
    colors: { bg: '#E6F4FE', cardBg: '#FFFFFF', inputBg: '#D0EAF8', textColor: '#1a1a2e', subColor: '#78909C', borderColor: '#B3D9F7' },
  },
  'mario': {
    id: 'mario',
    label: 'Starry Blue',
    isDark: true,
    colors: { bg: '#0a1a4a', cardBg: '#1a2a6e', inputBg: '#071040', textColor: '#ffffff', subColor: '#a0b8e0', borderColor: '#2a3a8a' },
  },
  'white': {
    id: 'white',
    label: 'White',
    isDark: false,
    colors: { bg: '#f2f2f7', cardBg: '#ffffff', inputBg: '#f0f4f8', textColor: '#1a1a2e', subColor: '#9E9E9E', borderColor: '#e2e8f0' },
  },
  'oled': {
    id: 'oled',
    label: 'OLED Black',
    isDark: true,
    colors: { bg: '#000000', cardBg: '#0d0d0d', inputBg: '#111111', textColor: '#e0e0e0', subColor: '#808090', borderColor: '#1c1c1c' },
  },
};

export interface AccentColor {
  label: string;
  color: string; // MD2 shade 600 — works on both light and dark themes
}

export const ACCENT_COLORS: AccentColor[] = [
  { label: 'Amber',       color: '#FFB300' },
  { label: 'Red',         color: '#E53935' },
  { label: 'Pink',        color: '#D81B60' },
  { label: 'Purple',      color: '#8E24AA' },
  { label: 'Deep Purple', color: '#5E35B1' },
  { label: 'Indigo',      color: '#3949AB' },
  { label: 'Blue',        color: '#1E88E5' },
  { label: 'Light Blue',  color: '#039BE5' },
  { label: 'Cyan',        color: '#00ACC1' },
  { label: 'Teal',        color: '#00897B' },
  { label: 'Green',       color: '#43A047' },
  { label: 'Light Green', color: '#7CB342' },
  { label: 'Lime',        color: '#C0CA33' },
  { label: 'Yellow',      color: '#FDD835' },
  { label: 'Orange',      color: '#FB8C00' },
  { label: 'Deep Orange', color: '#F4511E' },
  { label: 'Brown',       color: '#6D4C41' },
  { label: 'Grey',        color: '#757575' },
  { label: 'Blue Grey',   color: '#546E7A' },
];

import { TextStyle } from 'react-native';

export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

/** Shared validation error style — use as the `errorText` entry in any sheet's StyleSheet. */
export const sheetErrorText: TextStyle = {
  fontSize: 12,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: '#F44336',
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
        subColor: '#9E9E9E',
        borderColor: '#e2e8f0',
      };
}
